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
  type Subscription,
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
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  ToastService,
  calcularResumen,
  formatCop,
  type ImpuestoLinea,
  type ParamValue,
  type ResumenDocumento,
  type TasaImpuesto,
} from '@reddoc/core';
import {
  DocumentoDetalleService,
  type ImportarDocumentoModalData,
  type LineaPendienteApi,
} from '@erp/core/module-config';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { ErpItemAutocompleteComponent } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ErpImpuestoSelectComponent } from '@erp/core/components/impuesto-select/erp-impuesto-select.component';
import { ErpSelectDataService } from '@reddoc/core';
import { ItemService } from '@erp/features/general/masters/item/item.service';
import type { AppDict } from '@erp/i18n';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '../../comercial-documento-detalle.form';
import {
  comercialDetalleToFormValue,
  comercialDetalleToPayload,
  pendienteLineaToFormValue,
  lineBruto,
  lineNeto,
  tasaFromImpuestoOption,
  tasasDelItem,
  toLineaCalculo,
} from '../../comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '../../comercial-documento-detalle.model';
import type {
  ComercialDetalleFormRawValue,
  ImpuestoSeleccionarOption,
} from '../../comercial-documento-detalle.types';
import { ComercialDocumentoResumenComponent } from '../comercial-documento-resumen/comercial-documento-resumen.component';

/** Endpoint del catálogo de impuestos (mismo que usa `app-impuesto-select`). */
const IMPUESTO_SELECCIONAR_ENDPOINT = '/general/impuesto/seleccionar/';

/**
 * Tabla de **líneas (detalles)** de un documento comercial. Reutilizable por
 * todos los documentos comerciales (factura venta/compra, notas): recibe el
 * `FormArray` del form padre y lo edita **inline** (grid de factura).
 *
 * El cálculo por línea (subtotal/impuesto/neto) y el resumen del documento se
 * derivan del valor del array vía el kernel `@reddoc/core/calculo`. La tabla es
 * agnóstica al tipo de documento.
 *
 * Persistencia (igual que la familia servicio): en **alta** (`documentId == null`)
 * las líneas viven en el `FormArray` y viajan embebidas al crear el documento;
 * en **edición** transaccionan al instante contra `/documento-detalle` (botón
 * "guardar línea" por fila; baja inmediata).
 */
@Component({
  selector: 'app-comercial-documento-detalles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    SplitButtonModule,
    InputNumberModule,
    InputTextModule,
    PopoverModule,
    TooltipModule,
    ConfirmDialogModule,
    ErpItemAutocompleteComponent,
    ErpImpuestoSelectComponent,
    ComercialDocumentoResumenComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './comercial-documento-detalles.component.html',
  styleUrl: './comercial-documento-detalles.component.scss',
})
export class ComercialDocumentoDetallesComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly itemService = inject(ItemService);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;

  /** FormArray de líneas, propiedad del form padre. */
  readonly detalles = input.required<FormArray<ComercialDetalleGroup>>();

  /**
   * Familia fiscal del documento. Selecciona qué impuestos ofrece/def-selecciona
   * el editor: `'venta'` usa los `impuesto_venta` (catálogo `?venta=True`);
   * `'compra'` los `impuesto_compra` (catálogo `?compra=True`). Default `'venta'`
   * para no alterar los documentos de venta existentes.
   */
  readonly modo = input<'venta' | 'compra'>('venta');

  /**
   * Id del documento en edición (`null` en alta). Cuando existe, las líneas
   * transaccionan al instante contra `/documento-detalle`.
   */
  readonly documentId = input<number | null>(null);

  /**
   * Habilita el botón "importar desde documento". Lo activa cada documento que
   * soporte importar líneas pendientes (p. ej. factura de venta).
   */
  readonly importEnabled = input<boolean>(false);

  /**
   * Contacto del documento actual (de la cabecera del form padre). Acota las
   * líneas pendientes del modal de importación a ese contacto.
   */
  readonly contactoId = input<number | null>(null);

  /**
   * Avisa al padre que se importaron líneas en **edición** (ya persistidas vía
   * `masivo/`) para que recargue el documento y refresque el `FormArray` con los
   * ids y montos autoritativos del backend.
   */
  readonly imported = output<void>();

  /** Importación en curso; bloquea el botón mientras resuelve/persiste. */
  protected readonly importing = signal(false);

  /**
   * Acciones del dropdown del botón "Agregar línea" (SplitButton). Hoy solo
   * "importar desde documento"; se deshabilita sin contacto (acota las pendientes).
   */
  protected readonly addLineMenu = computed<MenuItem[]>(() => [
    {
      label: this.t().documentImport.buttonLabel,
      icon: 'pi pi-file-import',
      disabled: this.contactoId() === null,
      command: () => this.openImport(),
    },
  ]);

  /** Espejo reactivo del valor del array para la tabla, los totales y el resumen. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);

  /** Resumen del documento: subtotal, desglose por impuesto y total. */
  protected readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Grupo persistiéndose ahora mismo (edición); bloquea su botón. */
  protected readonly savingGroup = signal<ComercialDetalleGroup | null>(null);

  /** Guardado en lote ("Guardar líneas" / flush del padre) en curso. */
  protected readonly savingAll = signal(false);

  /** Filas ya cableadas al fetch de impuestos del ítem (evita doble suscripción). */
  private readonly wired = new WeakSet<ComercialDetalleGroup>();

  /**
   * Pool de tasas del catálogo (`general/impuesto/seleccionar/`) del `modo`
   * activo (venta o compra). Fuente autoritativa para calcular el monto de
   * **cualquier** impuesto elegido en la línea, no solo los configurados en el
   * ítem. Vacío hasta que el fetch resuelve.
   */
  private readonly impuestosCatalog = signal<readonly TasaImpuesto[]>([]);

  /**
   * Filtros del catálogo de impuestos según el `modo`: `?venta=True` o
   * `?compra=True`. Los comparten el pool de tasas con el que la tabla calcula y
   * el desplegable con el que la persona elige, para que ofrezcan lo mismo.
   */
  protected readonly impuestoParams = computed<Record<string, ParamValue>>(() => ({
    [this.modo()]: 'True',
  }));

  constructor() {
    // El catálogo depende de `modo`, que es un signal input: leerlo desde el
    // constructor devuelve siempre el default (`'venta'`) porque el binding aún
    // no se aplicó — un documento de compra terminaba calculando contra los
    // impuestos de venta y la línea quedaba sin impuesto. Dentro de un effect se
    // lee ya bindeado, y de paso recarga si el modo llegara a cambiar.
    effect((onCleanup) => {
      const sub = this.loadImpuestosCatalog(this.impuestoParams());
      onCleanup(() => sub.unsubscribe());
    });

    effect((onCleanup) => {
      const array = this.detalles();
      const sync = (): void => {
        this.lines.set(array.getRawValue());
        this.wireRows(array);
      };
      sync();
      const sub = array.valueChanges.subscribe(sync);
      onCleanup(() => sub.unsubscribe());
    });
  }

  /**
   * Carga el catálogo de impuestos acotado a `params` y lo aplica a las filas
   * nuevas. Devuelve la suscripción para que el effect que lo dispara cancele la
   * consulta en vuelo si vuelve a correr.
   */
  private loadImpuestosCatalog(params: Record<string, ParamValue>): Subscription {
    return this.selectData
      .fetchOptions<ImpuestoSeleccionarOption>(IMPUESTO_SELECCIONAR_ENDPOINT, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => {
          this.impuestosCatalog.set(options.map(tasaFromImpuestoOption));
          // Filas nuevas (sin id) que esperaban el catálogo para poder calcular.
          for (const group of this.detalles().controls) {
            if (group.controls.id.value == null) this.ensureCatalog(group);
          }
        },
        error: () => {
          // Sin catálogo, las líneas conservan los montos del ítem/backend.
        },
      });
  }

  protected addLinea(): void {
    this.detalles().push(createComercialDetalleGroup());
  }

  /**
   * Abre el modal de "importar desde documento" (lazy) y, con las filas
   * seleccionadas, resuelve cada línea origen y la agrega. El modal solo
   * selecciona; toda la resolución/persistencia ocurre aquí.
   */
  protected openImport(): void {
    if (this.importing()) return;
    const data: ImportarDocumentoModalData = { contactoId: this.contactoId() };

    from(
      import('@erp/core/module-config/importar-documento/components/importar-documento-modal/importar-documento-modal.component'),
    )
      .pipe(
        switchMap(({ ImportarDocumentoModalComponent }) => {
          const ref = this.dialog.open(ImportarDocumentoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '62rem',
            data,
          });
          return ref ? ref.onClose : EMPTY;
        }),
        // El modal cierra con `null` al cancelar: solo seguimos con filas reales.
        filter(
          (rows: unknown): rows is LineaPendienteApi[] => Array.isArray(rows) && rows.length > 0,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => this.resolveAndAdd(rows));
  }

  /**
   * Construye las líneas desde las filas seleccionadas (la fila `pendiente/` ya
   * trae item/precio/impuestos, no hace falta lectura extra) y bifurca según el
   * modo: alta → push virtual al `FormArray`; edición → alta masiva + recarga del padre.
   */
  private resolveAndAdd(rows: readonly LineaPendienteApi[]): void {
    const formValues = rows.map(pendienteLineaToFormValue);
    const docId = this.documentId();
    if (docId == null) this.addImportedLocal(formValues);
    else this.persistImported(docId, formValues);
  }

  /** Alta: empuja las líneas resueltas al `FormArray` (se guardan al crear el documento). */
  private addImportedLocal(formValues: readonly ComercialDetalleFormRawValue[]): void {
    for (const value of formValues) this.detalles().push(createComercialDetalleGroup(value));
    const toast = this.t().documentImport.toasts.addSuccess;
    this.toast.success(toast.title, toast.desc);
  }

  /** Edición: alta masiva (`masivo/`) en una request; el padre recarga al terminar. */
  private persistImported(
    docId: number,
    formValues: readonly ComercialDetalleFormRawValue[],
  ): void {
    this.importing.set(true);
    const detalles = formValues.map(comercialDetalleToPayload);
    this.detalleService
      .crearMasivo(docId, detalles)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.importing.set(false);
          const toast = this.t().documentImport.toasts.addSuccess;
          this.toast.success(toast.title, toast.desc);
          this.imported.emit();
        },
        error: () => {
          this.importing.set(false);
          const toast = this.t().documentImport.toasts.addError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Pide confirmación y, al aceptar, elimina la línea (persiste en edición). */
  protected removeLinea(group: ComercialDetalleGroup): void {
    const { id } = group.getRawValue();
    this.confirmation.confirm({
      message: this.t().entities.comercialDetalle.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLinea(group, id),
    });
  }

  /**
   * Una fila está **pendiente** (sin persistir) cuando es nueva con ítem elegido
   * o cuando una existente fue modificada. Una fila recién agregada y vacía no
   * cuenta: no hay nada que guardar ni perder.
   */
  protected isPending(group: ComercialDetalleGroup): boolean {
    // En alta no hay persistencia por línea: las líneas viajan con el documento.
    if (this.documentId() == null) return false;
    return group.controls.id.value == null ? group.controls.item.value != null : group.dirty;
  }

  /** Filas pendientes (para el conteo del toolbar y el flush del padre). */
  private pendingRows(): readonly ComercialDetalleGroup[] {
    return this.detalles().controls.filter((row) => this.isPending(row));
  }

  /** Nº de líneas sin guardar; alimenta el botón, el toolbar y el guard de salida. */
  pendingCount(): number {
    return this.pendingRows().length;
  }

  /** Filas pendientes y válidas: las que `saveAll`/el ✓ pueden persistir ya. */
  private pendingSavable(): readonly ComercialDetalleGroup[] {
    return this.pendingRows().filter((row) => row.valid);
  }

  /** `true` si alguna línea pendiente está incompleta (p. ej. sin ítem). */
  hasInvalidPending(): boolean {
    return this.pendingRows().some((row) => row.invalid);
  }

  /** `true` cuando procede mostrar el botón "guardar línea" (solo edición). */
  protected canSaveRow(group: ComercialDetalleGroup): boolean {
    return this.documentId() != null && group.valid && this.isPending(group);
  }

  protected isSavingRow(group: ComercialDetalleGroup): boolean {
    return this.savingGroup() === group;
  }

  /**
   * Persiste una línea (PATCH si ya tiene `id`, POST con `documento_id` si es
   * nueva) y la reconstruye desde la respuesta autoritativa del backend
   * (impuestos y montos recalculados). Núcleo compartido por el ✓ por fila y el
   * guardado en lote; no muestra toasts (los pone cada caller).
   */
  private persistRow(group: ComercialDetalleGroup): Observable<ComercialDetalleRead> {
    const docId = this.documentId() as number;
    const payload = comercialDetalleToPayload(group.getRawValue());
    const id = group.controls.id.value;
    const op =
      id != null
        ? this.detalleService.actualizar<ComercialDetalleRead>(id, payload)
        : this.detalleService.crear<ComercialDetalleRead>(docId, payload);
    return op.pipe(
      tap((saved) => {
        const index = this.detalles().controls.indexOf(group);
        if (index >= 0)
          this.detalles().setControl(
            index,
            createComercialDetalleGroup(comercialDetalleToFormValue(saved)),
          );
      }),
    );
  }

  /** Guarda una sola línea (botón ✓ por fila). */
  protected saveLinea(group: ComercialDetalleGroup): void {
    if (this.documentId() == null || group.invalid || this.savingGroup() || this.savingAll())
      return;
    this.savingGroup.set(group);
    this.persistRow(group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.comercialDetalle.toasts.lineSaveSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.comercialDetalle.toasts.lineSaveError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Click del botón "Guardar líneas": avisa de incompletas y guarda las válidas. */
  protected onSaveAllClick(): void {
    if (this.hasInvalidPending()) {
      const toast = this.t().entities.comercialDetalle.toasts.incompleteLines;
      this.toast.warn(toast.title, toast.desc);
    }
    if (this.pendingSavable().length === 0) return;
    this.saveAll().subscribe({
      next: () => {
        const toast = this.t().entities.comercialDetalle.toasts.allSaved;
        this.toast.success(toast.title, toast.desc);
      },
      error: () => {
        const toast = this.t().entities.comercialDetalle.toasts.lineSaveError;
        this.toast.error(toast.title, toast.desc);
      },
    });
  }

  /**
   * Guarda en lote todas las líneas pendientes y válidas. Lo usa el botón del
   * toolbar y el form padre al guardar el documento (para no perder cambios).
   * Devuelve un Observable que completa al persistir todas (el padre encadena la
   * cabecera) y emite error si alguna falla. No existe update masivo en la API,
   * así que persiste fila por fila (altas y ediciones mezcladas) en paralelo.
   *
   * Operación pura: no muestra toasts (el feedback es decisión de cada caller,
   * que conoce su intención —botón del toolbar vs. flush silencioso al guardar
   * el documento— y evita dobles avisos).
   */
  saveAll(): Observable<void> {
    // `defer`: el flag de carga y las peticiones se atan al `subscribe`, no a la
    // llamada. Así `savingAll` nunca queda colgado si alguien arma el observable
    // sin suscribirse, y las filas se evalúan en el momento de ejecutar.
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

  // ── Columnas calculadas (por índice, derivadas del espejo `lines`) ──────────
  protected subtotalOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineBruto(line) : 0;
  }

  /** Impuestos de la línea (id, nombre, monto) para renderizar los badges de la columna. */
  protected impuestosOf(index: number): readonly ImpuestoLinea[] {
    return this.lines()[index]?.impuestos_totales ?? [];
  }

  protected netoOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineNeto(line) : 0;
  }

  /**
   * Cablea cada fila nueva:
   *  - al (re)elegir ítem, default-selecciona sus impuestos de venta.
   *  - al cambiar los impuestos elegidos, garantiza el pool de tasas del catálogo
   *    (cubre alternar impuestos en líneas en edición sin re-elegir el ítem).
   */
  private wireRows(array: FormArray<ComercialDetalleGroup>): void {
    for (const group of array.controls) {
      if (this.wired.has(group)) continue;
      this.wired.add(group);
      group.controls.item.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((opt) => this.loadItemTaxes(group, opt));
      group.controls.impuestos_ids.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.ensureCatalog(group));
    }
  }

  /**
   * Default-selecciona los impuestos del ítem (según `modo`) y asegura el pool de
   * tasas. Las tasas para calcular salen del catálogo (`ensureCatalog`), no del ítem.
   */
  private loadItemTaxes(group: ComercialDetalleGroup, opt: ItemOption | null): void {
    if (!opt) {
      group.controls.impuestos_ids.setValue([]);
      return;
    }
    this.ensureCatalog(group);
    this.itemService
      .getById(opt.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((item) => {
        group.controls.impuestos_ids.setValue(
          tasasDelItem(item, this.modo()).map((tasa) => tasa.id),
        );
      });
  }

  /**
   * Asegura que la fila tenga el pool de tasas del catálogo para recalcular.
   * Idempotente: solo lo setea si el catálogo está cargado y el pool de la fila
   * aún está vacío (no pisa montos del backend en edición hasta que el usuario
   * toca los impuestos). El recompute del grupo se dispara al setear el pool.
   */
  private ensureCatalog(group: ComercialDetalleGroup): void {
    const catalog = this.impuestosCatalog();
    if (catalog.length === 0) return;
    if (group.controls.impuestos_disponibles.value.length > 0) return;
    group.controls.impuestos_disponibles.setValue(catalog);
  }

  /** Ejecuta la baja: local en alta/línea no persistida; contra la API en edición. */
  private deleteLinea(group: ComercialDetalleGroup, id: number | null): void {
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

  /** Quita un grupo del `FormArray` por su referencia (robusto ante reordenamientos). */
  private removeGroup(group: ComercialDetalleGroup): void {
    const i = this.detalles().controls.indexOf(group);
    if (i >= 0) this.detalles().removeAt(i);
  }
}
