import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  type Observable,
  defer,
  filter,
  finalize,
  forkJoin,
  from,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import type { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { type ErpSelectOption, I18nService, SELECT_ENDPOINTS, ToastService } from '@reddoc/core';
import {
  DocumentoDetalleService,
  type AgregarDocumentoModalData,
  type CarteraTipo,
  type DocumentoPendienteApi,
} from '@erp/core/module-config';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import { ErpApiSelectComponent, ErpContactoSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import {
  createCuentaDetalleGroup,
  type CuentaDetalleGroup,
} from '../../contable-documento-detalle.form';
import {
  calcularResumenContable,
  cuentaDetalleToFormValue,
  cuentaDetalleToPayload,
  documentoPendienteToFormValue,
} from '../../contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '../../contable-documento-detalle.model';
import type { CuentaDetalleFormRawValue } from '../../contable-documento-detalle.types';
import { ContableDocumentoResumenComponent } from '../contable-documento-resumen/contable-documento-resumen.component';

/** Columnas fijas: nº, cuenta, naturaleza, valor y acciones. */
const BASE_COLUMN_COUNT = 5;

/**
 * Tabla de **líneas de cuenta contable** (asientos manuales) de un documento.
 * Espeja `ComercialDocumentoDetallesComponent` pero sin ítems ni impuestos:
 * cuenta + naturaleza (D/C) + valor, con el acumulado de débitos/créditos.
 *
 * Las columnas `contacto`, `centro_costo` y `base` son **opt-in** (`showContacto`,
 * `showCentroCosto`, `showBase`): un documento las pide solo si su negocio las imputa
 * —el pago sí, la factura de compra no—. El `FormGroup` siempre las tiene, así
 * que prenderlas no cambia el shape de la línea ni el mapper.
 *
 * Persistencia idéntica a la familia comercial: en **alta** (`documentId == null`)
 * las líneas viven en el `FormArray` y viajan embebidas al crear el documento; en
 * **edición** transaccionan al instante contra `/documento-detalle` (✓ por fila,
 * baja inmediata). Expone la misma API pública (`saveAll`, `pendingCount`,
 * `hasInvalidPending`) para que el form padre orqueste ítems y cuentas por igual.
 *
 * Con `agregarDocumentoEnabled` la tabla ofrece además **agregar documento**
 * (cruce de cartera): un modal de documentos con saldo pendiente cuya selección
 * entra como líneas enlazadas (`documento_afectado`, cuenta/naturaleza
 * bloqueadas, valor = pendiente). Espejo del "importar desde documento" comercial.
 */
@Component({
  selector: 'app-contable-documento-detalles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    SplitButtonModule,
    InputNumberModule,
    SelectModule,
    TooltipModule,
    ConfirmDialogModule,
    ErpCuentaSelectComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ContableDocumentoResumenComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './contable-documento-detalles.component.html',
  styleUrl: './contable-documento-detalles.component.scss',
})
export class ContableDocumentoDetallesComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  /** FormArray de líneas de cuenta, propiedad del form padre. */
  readonly detalles = input.required<FormArray<CuentaDetalleGroup>>();

  /**
   * Id del documento en edición (`null` en alta). Cuando existe, las líneas
   * transaccionan al instante contra `/documento-detalle`.
   */
  readonly documentId = input<number | null>(null);

  /** Muestra la columna de tercero por línea (la imputa el pago; la factura no). */
  readonly showContacto = input<boolean>(false);

  /**
   * Tercero con el que nace cada línea nueva. Lo decide el documento padre —el
   * pago siembra el de su cabecera—; la tabla solo lo aplica al agregar.
   */
  readonly contactoPorDefecto = input<ErpSelectOption | null>(null);

  /** Muestra la columna de centro de costo. */
  readonly showCentroCosto = input<boolean>(false);

  /** Muestra la columna de base gravable. */
  readonly showBase = input<boolean>(false);

  /**
   * Suma la fila "Total" (el neto según `carteraTipo`) al resumen. Solo tiene
   * sentido donde el neto es el documento —un recaudo o un desembolso—, no en
   * una pestaña de asientos.
   */
  readonly showTotal = input<boolean>(false);

  /**
   * Habilita el "agregar documento" (cruce de cartera): el botón de agregar se
   * vuelve SplitButton con la opción de traer documentos pendientes como líneas
   * enlazadas. Lo prende cada documento que cruza cartera (pago, futuro egreso).
   */
  readonly agregarDocumentoEnabled = input<boolean>(false);

  /**
   * Familia de cartera del documento: CxC en el pago, CxP en el egreso. Acota
   * los pendientes del cruce y fija el signo del neto del resumen.
   */
  readonly carteraTipo = input<CarteraTipo>('cobrar');

  /**
   * Contacto de la cabecera (id). Acota los documentos pendientes del modal a
   * ese tercero; sin contacto la opción se deshabilita.
   */
  readonly contactoId = input<number | null>(null);

  /** Muestra la columna "Documento" (tipo + número del cruce) de las líneas enlazadas. */
  readonly showDocumento = input<boolean>(false);

  /**
   * Avisa al padre que se agregaron líneas en **edición** (ya persistidas vía
   * `masivo/`) para que recargue las líneas con los ids autoritativos del backend.
   */
  readonly imported = output<void>();

  /** Endpoint del catálogo de centros de costo (columna `centro_costo`). */
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () =>
      BASE_COLUMN_COUNT +
      [this.showDocumento(), this.showContacto(), this.showCentroCosto(), this.showBase()].filter(
        Boolean,
      ).length,
  );

  /** Cruce en curso (modal abierto resolviendo o `masivo/` en vuelo); bloquea reentradas. */
  protected readonly addingDocumentos = signal(false);

  /**
   * Acciones del dropdown del botón "Agregar línea" (SplitButton, solo con
   * `agregarDocumentoEnabled`). Hoy solo "agregar documento"; se deshabilita
   * sin contacto (los pendientes se acotan al tercero de la cabecera).
   */
  protected readonly addLineMenu = computed<MenuItem[]>(() => [
    {
      label: this.t().documentAdd.buttonLabel,
      icon: 'pi pi-file-plus',
      disabled: this.contactoId() === null,
      command: () => this.openAgregarDocumento(),
    },
  ]);

  /** Opciones del select de naturaleza (D/C), con etiquetas i18n. */
  protected readonly naturalezaOptions = computed(() => [
    { label: this.t().entities.cuentaDetalle.naturaleza.debito, value: 'D' as const },
    { label: this.t().entities.cuentaDetalle.naturaleza.credito, value: 'C' as const },
  ]);

  /** Espejo reactivo del valor del array para la tabla y el resumen. */
  protected readonly lines = signal<readonly CuentaDetalleFormRawValue[]>([]);

  /** Acumulado de débitos/créditos; el signo del neto lo fija la familia de cartera. */
  protected readonly resumen = computed(() =>
    calcularResumenContable(this.lines(), this.carteraTipo()),
  );

  /** Grupo persistiéndose ahora mismo (edición); bloquea su botón. */
  protected readonly savingGroup = signal<CuentaDetalleGroup | null>(null);

  /** Guardado en lote ("Guardar líneas" / flush del padre) en curso. */
  protected readonly savingAll = signal(false);

  constructor() {
    effect((onCleanup) => {
      const array = this.detalles();
      const sync = (): void => this.lines.set(array.getRawValue());
      sync();
      const sub = array.valueChanges.subscribe(sync);
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected addLinea(): void {
    this.detalles().push(createCuentaDetalleGroup({ contacto: this.contactoPorDefecto() }));
  }

  /**
   * Abre el modal de "agregar documento" (lazy) y, con los documentos
   * seleccionados, arma las líneas de cruce y las agrega. El modal solo
   * selecciona; toda la resolución/persistencia ocurre aquí.
   */
  protected openAgregarDocumento(): void {
    if (this.addingDocumentos()) return;
    const data: AgregarDocumentoModalData = {
      contactoId: this.contactoId(),
      carteraTipo: this.carteraTipo(),
    };

    from(
      import('@erp/core/module-config/agregar-documento/components/agregar-documento-modal/agregar-documento-modal.component'),
    )
      .pipe(
        switchMap(({ AgregarDocumentoModalComponent }) => {
          const ref = this.dialog.open(AgregarDocumentoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '68rem',
            data,
          });
          return ref ? ref.onClose : EMPTY;
        }),
        // El modal cierra con `null` al cancelar: solo seguimos con filas reales.
        filter(
          (rows: unknown): rows is DocumentoPendienteApi[] =>
            Array.isArray(rows) && rows.length > 0,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => this.resolveAndAddDocumentos(rows));
  }

  /**
   * Construye las líneas enlazadas desde los documentos seleccionados y bifurca
   * según el modo: alta → push al `FormArray`; edición → alta masiva + recarga
   * del padre (`imported`).
   */
  private resolveAndAddDocumentos(rows: readonly DocumentoPendienteApi[]): void {
    const formValues = rows.map((row) => documentoPendienteToFormValue(row, this.carteraTipo()));
    const docId = this.documentId();
    if (docId == null) {
      for (const value of formValues) this.detalles().push(createCuentaDetalleGroup(value));
      const toast = this.t().documentAdd.toasts.addSuccess;
      this.toast.success(toast.title, toast.desc);
      return;
    }

    this.addingDocumentos.set(true);
    const detalles = formValues.map(cuentaDetalleToPayload);
    this.detalleService
      .crearMasivo(docId, detalles)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addingDocumentos.set(false);
          const toast = this.t().documentAdd.toasts.addSuccess;
          this.toast.success(toast.title, toast.desc);
          this.imported.emit();
        },
        error: () => {
          this.addingDocumentos.set(false);
          const toast = this.t().documentAdd.toasts.addError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Pide confirmación y, al aceptar, elimina la línea (persiste en edición). */
  protected removeLinea(group: CuentaDetalleGroup): void {
    const { id } = group.getRawValue();
    this.confirmation.confirm({
      message: this.t().entities.cuentaDetalle.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLinea(group, id),
    });
  }

  /**
   * Una fila está **pendiente** (sin persistir) cuando es nueva con cuenta elegida
   * o cuando una existente fue modificada. Una fila recién agregada y vacía no
   * cuenta: no hay nada que guardar ni perder.
   */
  protected isPending(group: CuentaDetalleGroup): boolean {
    if (this.documentId() == null) return false;
    return group.controls.id.value == null ? group.controls.cuenta.value != null : group.dirty;
  }

  private pendingRows(): readonly CuentaDetalleGroup[] {
    return this.detalles().controls.filter((row) => this.isPending(row));
  }

  /** Nº de líneas sin guardar; alimenta el botón, el toolbar y el guard de salida. */
  pendingCount(): number {
    return this.pendingRows().length;
  }

  private pendingSavable(): readonly CuentaDetalleGroup[] {
    return this.pendingRows().filter((row) => row.valid);
  }

  /** `true` si alguna línea pendiente está incompleta (p. ej. sin cuenta o sin valor). */
  hasInvalidPending(): boolean {
    return this.pendingRows().some((row) => row.invalid);
  }

  protected canSaveRow(group: CuentaDetalleGroup): boolean {
    return this.documentId() != null && group.valid && this.isPending(group);
  }

  protected isSavingRow(group: CuentaDetalleGroup): boolean {
    return this.savingGroup() === group;
  }

  /**
   * Persiste una línea (PATCH si ya tiene `id`, POST con `documento_id` si es
   * nueva) y la reconstruye desde la respuesta autoritativa del backend. Núcleo
   * compartido por el ✓ por fila y el guardado en lote; no muestra toasts.
   */
  private persistRow(group: CuentaDetalleGroup): Observable<CuentaDetalleRead> {
    const docId = this.documentId() as number;
    const payload = cuentaDetalleToPayload(group.getRawValue());
    const id = group.controls.id.value;
    const op =
      id != null
        ? this.detalleService.actualizar<CuentaDetalleRead>(id, payload)
        : this.detalleService.crear<CuentaDetalleRead>(docId, payload);
    return op.pipe(
      tap((saved) => {
        const index = this.detalles().controls.indexOf(group);
        if (index >= 0)
          this.detalles().setControl(
            index,
            createCuentaDetalleGroup(cuentaDetalleToFormValue(saved)),
          );
      }),
    );
  }

  /** Guarda una sola línea (botón ✓ por fila). */
  protected saveLinea(group: CuentaDetalleGroup): void {
    if (this.documentId() == null || group.invalid || this.savingGroup() || this.savingAll())
      return;
    this.savingGroup.set(group);
    this.persistRow(group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.cuentaDetalle.toasts.lineSaveSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.cuentaDetalle.toasts.lineSaveError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Click del botón "Guardar líneas": avisa de incompletas y guarda las válidas. */
  protected onSaveAllClick(): void {
    if (this.hasInvalidPending()) {
      const toast = this.t().entities.cuentaDetalle.toasts.incompleteLines;
      this.toast.warn(toast.title, toast.desc);
    }
    if (this.pendingSavable().length === 0) return;
    this.saveAll().subscribe({
      next: () => {
        const toast = this.t().entities.cuentaDetalle.toasts.allSaved;
        this.toast.success(toast.title, toast.desc);
      },
      error: () => {
        const toast = this.t().entities.cuentaDetalle.toasts.lineSaveError;
        this.toast.error(toast.title, toast.desc);
      },
    });
  }

  /**
   * Guarda en lote todas las líneas pendientes y válidas. Lo usa el botón del
   * toolbar y el form padre al guardar el documento (para no perder cambios).
   * Operación pura: no muestra toasts (el feedback lo decide cada caller).
   */
  saveAll(): Observable<void> {
    return defer(() => {
      const rows = this.pendingSavable();
      if (this.documentId() == null || rows.length === 0) return of(undefined);

      this.savingAll.set(true);
      return forkJoin(rows.map((row) => this.persistRow(row))).pipe(
        map(() => undefined),
        finalize(() => this.savingAll.set(false)),
      );
    }).pipe(takeUntilDestroyed(this.destroyRef));
  }

  /** Ejecuta la baja: local en alta/línea no persistida; contra la API en edición. */
  private deleteLinea(group: CuentaDetalleGroup, id: number | null): void {
    if (this.documentId() == null || id == null) {
      this.removeGroup(group);
      return;
    }
    this.detalleService
      .eliminar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removeGroup(group);
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  private removeGroup(group: CuentaDetalleGroup): void {
    const i = this.detalles().controls.indexOf(group);
    if (i >= 0) this.detalles().removeAt(i);
  }
}
