import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, concat, defer, of, throwError } from 'rxjs';
import { catchError, finalize, ignoreElements, tap } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import {
  I18nService,
  ToastService,
  extractErrorMessage,
  formatCop,
  CUENTA_BANCO_ENDPOINT,
  calcularPagos,
  catalogoCompartido,
  type PagoRead,
  DocumentoPagoService,
} from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { createPagoGroup, type PagoFormRawValue, type PagoGroup } from '../../pago.form';
import { pagoReadToFormValue, pagoToPayload } from '../../pago.mapper';
import { PagosEnCursoError } from '../../pago.errors';

/**
 * Tabla **editable** de pagos de un documento que se cobra en el acto (factura de
 * venta, POS, nota crédito…). Building block transversal: recibe el `FormArray` de
 * pagos del form padre y lo edita inline (cuenta de banco + monto).
 *
 * Se guarda igual que la tabla de detalles, contra `/general/documento-pago/`:
 * - **Edición** (`documentId` presente): la tabla no escribe nada por su cuenta. Altas,
 *   ediciones y bajas quedan pendientes y las persiste `saveAll()` cuando el form
 *   padre guarda el documento; "Volver" las descarta.
 * - **Alta** (sin `documentId`): las filas viven en memoria y el padre las registra
 *   con `saveAll(idCreado)` apenas el backend devuelve el documento.
 *
 * Los pagos anulados (vienen del backend) se muestran de solo lectura y no cuentan.
 * Que la suma no supere el total no se valida aquí: lo valida el backend al aprobar
 * y el documento lo avisa en su resumen.
 */
@Component({
  selector: 'app-documento-pagos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputNumberModule,
    TooltipModule,
    ErpApiSelectComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './documento-pagos.component.html',
  styleUrl: './documento-pagos.component.scss',
})
export class DocumentoPagosComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly pagoService = inject(DocumentoPagoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;
  /** Catálogo de cuentas de banco, cargado una vez para todos los pagos (ver `catalogoCompartido`). */
  protected readonly cuentaBancoCatalogo = catalogoCompartido(CUENTA_BANCO_ENDPOINT);

  /** FormArray de pagos, propiedad del form padre. */
  readonly pagos = input.required<FormArray<PagoGroup>>();

  /** Total del documento; de él sale el saldo con que se prellena cada fila nueva. */
  readonly documentTotal = input.required<number>();

  /** Id del documento en edición; `null` en alta (las filas se registran al crear). */
  readonly documentId = input<number | null>(null);

  /**
   * Texto de ayuda bajo el toolbar. Opcional: cada documento puede matizarlo
   * (POS: "cobros en el punto de venta"); por defecto, genérico.
   */
  readonly hint = input<string | null>(null);

  /** Espejo reactivo del valor del array para calcular el saldo. */
  private readonly mirror = signal<readonly PagoFormRawValue[]>([]);

  /** Saldo por la misma función con que el documento arma su resumen. */
  private readonly calculo = computed(() => calcularPagos(this.mirror(), this.documentTotal()));

  /** Saldo pendiente por cubrir con pagos (nunca negativo). */
  protected readonly saldoPendiente = computed(() => this.calculo().saldo);

  /** Guardado de los pagos (flush del form padre al guardar el documento) en curso. */
  protected readonly savingAll = signal(false);

  /**
   * Hay un guardado en curso. El padre deshabilita su "Guardar" mientras tanto:
   * guardar a la vez reenviaría filas que aún no tienen `id`.
   */
  readonly ocupado = computed(() => this.savingAll());

  /**
   * Ids de pagos persistidos que la persona quitó en edición. La fila sale de la tabla
   * (y del saldo) al instante, pero el `DELETE` espera al guardado del documento:
   * salir sin guardar los conserva.
   */
  private readonly eliminados = signal<readonly number[]>([]);

  /**
   * `true` desde que el effect de sincronización corrió, es decir, con los inputs ya
   * asignados. El form padre pide `pendingCount()` desde su barra de acciones, que se
   * evalúa antes que esta tabla (va más abajo en la plantilla): leer el input
   * obligatorio en ese momento lanza NG0950. Al montar no hay nada pendiente.
   */
  private readonly montada = signal(false);

  constructor() {
    // Espejo reactivo del FormArray inyectado (se re-suscribe si cambia la instancia).
    effect((onCleanup) => {
      const array = this.pagos();
      this.montada.set(true);
      this.mirror.set(array.getRawValue());
      const sub = array.valueChanges.subscribe(() => this.mirror.set(array.getRawValue()));
      onCleanup(() => sub.unsubscribe());
    });
  }

  /**
   * Agrega una fila de pago con el saldo pendiente como monto: el caso común es
   * cobrar lo que falta, así que un solo clic cuadra el documento. Sin valor por
   * cobrar (no hay detalles) no hay pago que registrar: se avisa en vez de crear
   * una fila en cero.
   */
  protected addPago(): void {
    // Mientras se guarda no se agregan filas: quedarían fuera del lote en vuelo.
    if (this.ocupado()) return;
    if (this.documentTotal() <= 0) {
      const toast = this.t().entities.documentoPago.toasts.sinDetalles;
      this.toast.warn(toast.title, toast.desc);
      return;
    }
    if (this.saldoPendiente() <= 0) {
      // Los pagos ya cubren el total: una fila nueva nacería en cero e invalidaría el form.
      const toast = this.t().entities.documentoPago.toasts.sinSaldo;
      this.toast.warn(toast.title, toast.desc);
      return;
    }
    this.pagos().push(createPagoGroup({ pago: this.saldoPendiente() }));
  }

  protected isAnulado(group: PagoGroup): boolean {
    return group.controls.estado_anulado.value;
  }

  /**
   * Filas que hay que persistir: nuevas con cuenta elegida o existentes modificadas.
   * Un pago anulado nunca se persiste (es de solo lectura).
   */
  private rowsToPersist(): readonly PagoGroup[] {
    return this.pagos().controls.filter((row) => {
      // Anulado: solo lectura.
      if (this.isAnulado(row)) return false;
      return row.controls.id.value == null ? row.controls.cuenta_banco.value != null : row.dirty;
    });
  }

  /** ¿Fila sin guardar? Solo en edición: en alta todo viaja al crear el documento. */
  protected isPending(group: PagoGroup): boolean {
    return this.documentId() != null && this.rowsToPersist().includes(group);
  }

  /**
   * Nº de cambios sin guardar en edición (filas nuevas o editadas más las quitadas);
   * alimenta el toolbar, el aviso del form padre y el guard de salida.
   */
  pendingCount(): number {
    if (!this.montada()) return 0;
    if (this.documentId() == null) return 0;
    return this.rowsToPersist().length + this.eliminados().length;
  }

  /** Nº de pagos por registrar (no anulados); el padre lo mira en alta tras crear. */
  rowCount(): number {
    return this.rowsToPersist().length;
  }

  /** `true` si algún pago por guardar está incompleto (sin cuenta o en cero). */
  hasInvalidPending(): boolean {
    return this.rowsToPersist().some((row) => row.invalid);
  }

  /** Pendientes y válidos: los que `saveAll` puede persistir ya. */
  private pendingSavable(): readonly PagoGroup[] {
    return this.rowsToPersist().filter((row) => row.valid);
  }

  /**
   * Persiste una fila (PATCH con `id`, POST si es nueva) y la reconstruye desde la
   * respuesta del backend; reconstruida, deja de estar pendiente.
   *
   * Si la fila cambió mientras la petición viajaba (la persona corrigió el monto), no
   * se reconstruye: pisaría lo nuevo. Solo toma el `id` —para que el próximo guardado
   * sea un PATCH y no otra alta— y queda pendiente con lo que muestra la pantalla.
   */
  private persistRow(group: PagoGroup, documentoId: number): Observable<PagoRead> {
    const payload = pagoToPayload(group.getRawValue(), documentoId);
    const enviado = JSON.stringify(payload);
    const id = group.controls.id.value;
    const op =
      id != null ? this.pagoService.actualizar(id, payload) : this.pagoService.crear(payload);
    return op.pipe(
      tap((saved) => {
        const leido = pagoReadToFormValue(saved);
        if (JSON.stringify(pagoToPayload(group.getRawValue(), documentoId)) !== enviado) {
          group.controls.id.setValue(leido.id);
          group.markAsDirty();
          return;
        }
        const index = this.pagos().controls.indexOf(group);
        if (index >= 0) this.pagos().setControl(index, createPagoGroup(leido));
      }),
    );
  }

  /**
   * Borra un pago quitado y lo saca de `eliminados`. Un 404 cuenta como hecho: el pago
   * ya no existe (p. ej. lo borró un intento anterior cuya respuesta se perdió).
   */
  private persistBaja(id: number): Observable<void> {
    const hecho = (): void => this.eliminados.update((ids) => ids.filter((x) => x !== id));
    return this.pagoService.eliminar(id).pipe(
      tap(hecho),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          hecho();
          return of(undefined);
        }
        return throwError(() => err);
      }),
    );
  }

  /**
   * Guarda los cambios pendientes contra `documentoId` (por defecto el del documento
   * en edición; en alta, el recién creado): primero las bajas, después las altas y
   * ediciones válidas. Completa al terminar y emite error si alguna falla.
   *
   * - Va **en serie**, no en paralelo: cada escritura hace que el backend recalcule
   *   `documento.pago`, y dos a la vez sobre el mismo documento se pisarían la suma.
   * - Cada payload se arma **cuando le toca** (`defer`), no al empezar el lote: si la
   *   persona corrige un monto mientras se guardan las filas anteriores, viaja el nuevo.
   * - Con otro guardado en curso emite `PagosEnCursoError` en vez de reenviar filas.
   * - Si una escritura falla, corta ahí (en serie no hay nada en vuelo que cancelar). Lo
   *   ya guardado deja de estar pendiente, así que reintentar solo manda lo que faltó.
   *   Límite: si un POST llega al backend pero se pierde su respuesta, el reintento lo
   *   crea otra vez; evitarlo pide una clave de idempotencia del backend.
   *
   * Operación pura: no muestra toasts.
   */
  saveAll(documentoId: number | null = this.documentId()): Observable<void> {
    return defer(() => {
      if (this.ocupado()) return throwError(() => new PagosEnCursoError());
      if (documentoId == null) return of(undefined);
      const bajas = [...this.eliminados()];
      const rows = this.pendingSavable();
      if (bajas.length === 0 && rows.length === 0) return of(undefined);
      this.savingAll.set(true);
      return concat(
        ...bajas.map((id) => defer(() => this.persistBaja(id))),
        ...rows.map((row) => defer(() => this.persistRow(row, documentoId))),
      ).pipe(
        ignoreElements(),
        finalize(() => this.savingAll.set(false)),
      );
    }).pipe(takeUntilDestroyed(this.destroyRef));
  }

  /**
   * Quita un pago. Si ya existe en el backend (edición), pide confirmación y su id pasa
   * a `eliminados`: el `DELETE` se hace al guardar el documento. Una fila local solo
   * sale del array.
   */
  protected removePago(group: PagoGroup): void {
    const id = group.controls.id.value;
    if (this.documentId() == null || id == null) {
      this.removeRow(group);
      return;
    }
    this.confirmation.confirm({
      message: this.t().entities.documentoPago.confirmDelete,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.eliminados.update((ids) => [...ids, id]);
        this.removeRow(group);
      },
    });
  }

  private removeRow(group: PagoGroup): void {
    const index = this.pagos().controls.indexOf(group);
    if (index >= 0) this.pagos().removeAt(index);
  }
}
