import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { Observable, concat, defer, of } from 'rxjs';
import { finalize, ignoreElements, tap } from 'rxjs/operators';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, ToastService, formatCop } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { createPagoGroup, type PagoFormRawValue, type PagoGroup } from '../../pago.form';
import { CUENTA_BANCO_ENDPOINT } from '../../pago.constants';
import { calcularPagos } from '../../pago.calculo';
import { pagoReadToFormValue, pagoToPayload } from '../../pago.mapper';
import type { PagoRead } from '../../pago.model';
import { DocumentoPagoService } from '../../pago.service';

/**
 * Tabla **editable** de pagos de un documento que se cobra en el acto (factura de
 * venta, POS, nota crédito…). Building block transversal: recibe el `FormArray` de
 * pagos del form padre y lo edita inline (cuenta de banco + monto).
 *
 * Transacciona igual que la tabla de detalles, contra `/general/documento-pago/`:
 * - **Edición** (`documentId` presente): cada fila se guarda (✓) o elimina en vivo;
 *   las pendientes se marcan y el padre las persiste con `saveAll()` antes de
 *   guardar el documento.
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
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

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

  /** Fila que se está guardando con su ✓. */
  private readonly savingGroup = signal<PagoGroup | null>(null);

  /** Guardado en lote en curso (botón del toolbar o flush del padre). */
  protected readonly savingAll = signal(false);

  constructor() {
    // Espejo reactivo del FormArray inyectado (se re-suscribe si cambia la instancia).
    effect((onCleanup) => {
      const array = this.pagos();
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
    if (this.documentTotal() <= 0) {
      const toast = this.t().entities.documentoPago.toasts.sinDetalles;
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
      if (this.isAnulado(row)) return false;
      return row.controls.id.value == null ? row.controls.cuenta_banco.value != null : row.dirty;
    });
  }

  /** ¿Fila sin guardar? Solo en edición: en alta todo viaja al crear el documento. */
  protected isPending(group: PagoGroup): boolean {
    return this.documentId() != null && this.rowsToPersist().includes(group);
  }

  /** Nº de pagos sin guardar en edición; alimenta el toolbar y el guard de salida. */
  pendingCount(): number {
    return this.documentId() == null ? 0 : this.rowsToPersist().length;
  }

  /** Nº de pagos por registrar (no anulados); el padre lo mira en alta tras crear. */
  rowCount(): number {
    return this.rowsToPersist().length;
  }

  /** `true` si algún pago por guardar está incompleto (sin cuenta o en cero). */
  hasInvalidPending(): boolean {
    return this.rowsToPersist().some((row) => row.invalid);
  }

  protected canSaveRow(group: PagoGroup): boolean {
    return group.valid && this.isPending(group);
  }

  protected isSavingRow(group: PagoGroup): boolean {
    return this.savingGroup() === group;
  }

  /**
   * Persiste una fila (PATCH con `id`, POST si es nueva) y la reconstruye desde la
   * respuesta del backend. No muestra toasts: los pone cada caller.
   */
  private persistRow(group: PagoGroup, documentoId: number): Observable<PagoRead> {
    const payload = pagoToPayload(group.getRawValue(), documentoId);
    const id = group.controls.id.value;
    const op =
      id != null ? this.pagoService.actualizar(id, payload) : this.pagoService.crear(payload);
    return op.pipe(
      tap((saved) => {
        const index = this.pagos().controls.indexOf(group);
        if (index >= 0) this.pagos().setControl(index, createPagoGroup(pagoReadToFormValue(saved)));
      }),
    );
  }

  /** Guarda un solo pago (✓ por fila, en edición). */
  protected savePago(group: PagoGroup): void {
    const docId = this.documentId();
    if (docId == null || group.invalid || this.savingGroup() || this.savingAll()) return;
    this.savingGroup.set(group);
    this.persistRow(group, docId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.documentoPago.toasts.saveSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.documentoPago.toasts.saveError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Botón "Guardar pagos" del toolbar: avisa de incompletos y guarda los válidos. */
  protected onSaveAllClick(): void {
    const toasts = this.t().entities.documentoPago.toasts;
    if (this.hasInvalidPending())
      this.toast.warn(toasts.incompletos.title, toasts.incompletos.desc);
    this.saveAll().subscribe({
      complete: () => this.toast.success(toasts.allSaved.title, toasts.allSaved.desc),
      error: () => this.toast.error(toasts.saveError.title, toasts.saveError.desc),
    });
  }

  /**
   * Guarda todos los pagos pendientes y válidos contra `documentoId` (por defecto el
   * del documento en edición; en alta, el recién creado). Completa al terminar y
   * emite error si alguno falla.
   *
   * Va **en serie**, no en paralelo: cada escritura hace que el backend recalcule
   * `documento.pago`, y dos a la vez sobre el mismo documento se pisarían la suma.
   * Operación pura: no muestra toasts.
   */
  saveAll(documentoId: number | null = this.documentId()): Observable<void> {
    return defer(() => {
      const rows = this.rowsToPersist().filter((row) => row.valid);
      if (documentoId == null || rows.length === 0) return of(undefined);
      this.savingAll.set(true);
      return concat(...rows.map((row) => this.persistRow(row, documentoId))).pipe(
        ignoreElements(),
        finalize(() => this.savingAll.set(false)),
      );
    }).pipe(takeUntilDestroyed(this.destroyRef));
  }

  /**
   * Quita un pago. Si ya existe en el backend (edición), pide confirmación y lo
   * elimina allí; si es una fila local, solo sale del array.
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
      accept: () =>
        this.pagoService
          .eliminar(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.removeRow(group),
            error: () => {
              const toast = this.t().entities.documentoPago.toasts.deleteError;
              this.toast.error(toast.title, toast.desc);
            },
          }),
    });
  }

  private removeRow(group: PagoGroup): void {
    const index = this.pagos().controls.indexOf(group);
    if (index >= 0) this.pagos().removeAt(index);
  }
}
