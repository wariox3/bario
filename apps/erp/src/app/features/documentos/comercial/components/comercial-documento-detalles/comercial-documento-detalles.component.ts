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
  Subject,
  type Subscription,
  catchError,
  concatMap,
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
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import type { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  ToastService,
  calcularResumen,
  formatCop,
  toFiniteNumber,
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
import {
  ITEM_SELECCIONAR_ENDPOINT,
  toItemOption,
  type ItemApiRow,
  type ItemOption,
} from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ErpImpuestoSelectComponent } from '@erp/core/components/impuesto-select/erp-impuesto-select.component';
import {
  IMPUESTO_SELECCIONAR_ENDPOINT,
  tasaFromImpuestoOption,
  type ImpuestoSeleccionarOption,
} from '@erp/core/components/impuesto-select/impuesto-seleccionar.types';
import { ErpSelectDataService } from '@reddoc/core';
import { ItemService } from '@erp/features/general/masters/item/item.service';
import { PrecioDetalleService } from '@erp/features/general/masters/precio/precio-detalle.service';
import type { Item } from '@erp/features/general/masters/item/item.model';
import type { AppDict } from '@erp/i18n';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '../../comercial-documento-detalle.form';
import {
  comercialDetalleToFormValue,
  comercialDetalleToPayload,
  pendienteLineaToFormValue,
  precioUnitarioConImpuestos,
  precioUnitarioSinImpuestos,
  lineBase,
  lineBruto,
  lineNeto,
  tasasDelItem,
  toLineaCalculo,
} from '../../comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '../../comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '../../comercial-documento-detalle.types';
import { ComercialDocumentoResumenComponent } from '../comercial-documento-resumen/comercial-documento-resumen.component';

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
    FormsModule,
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
  private readonly precioDetalleService = inject(PrecioDetalleService);
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
   * Lista de precios del contacto de la cabecera (`precio_id` del contacto;
   * ver `precioListaDeContacto`). Solo aplica en `modo="venta"`: al elegir un
   * ítem se cotiza contra la lista y ese precio pisa el del ítem. `null` = sin
   * lista, la línea queda con el precio propio del ítem.
   */
  readonly precioListaId = input<number | null>(null);

  /**
   * Habilita el lector de código de barras en la barra de la tabla (flujo
   * pistola: Enter agrega la línea y el input queda listo para el siguiente
   * escaneo). Lo activa cada documento donde se factura escaneando.
   */
  readonly scannerEnabled = input<boolean>(false);

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
  protected readonly impuestosCatalog = signal<readonly TasaImpuesto[]>([]);

  /**
   * Cola de escaneos del lector. `concatMap` los resuelve **en orden**: una
   * pistola puede disparar varios códigos seguidos y cada uno debe agregar su
   * línea sin pisar la consulta del anterior.
   */
  private readonly scan$ = new Subject<{ codigo: string; input: HTMLInputElement }>();

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

    this.scan$
      .pipe(
        concatMap(({ codigo, input }) =>
          this.selectData
            .fetchOptions<ItemApiRow>(ITEM_SELECCIONAR_ENDPOINT, { search: codigo })
            .pipe(
              map((rows) => ({ rows, codigo, input })),
              catchError(() => of({ rows: [] as readonly ItemApiRow[], codigo, input })),
            ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ rows, codigo, input }) => this.applyScan(rows, codigo, input));

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
          for (const group of this.detalles().controls) {
            // Filas nuevas (sin id) que esperaban el catálogo para poder calcular.
            if (group.controls.id.value == null) this.ensureCatalog(group);
            // Filas cargadas: corregir el signo de las retenciones leídas.
            this.normalizarImpuestosLeidos(group);
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
   * Alta de ítem inline desde una línea: abre el formulario del master como
   * modal (lazy) y, con el ítem creado, lo selecciona en **esa** fila — de ahí
   * corre la tubería normal de una selección (precio pactado + impuestos). Se
   * apaga `dismissableMask`: un clic afuera no debe descartar un form a medias.
   */
  protected onCreateItem(group: ComercialDetalleGroup): void {
    from(import('@erp/features/general/masters/item/pages/item-form/item-form.component'))
      .pipe(
        switchMap(({ ItemFormComponent }) => {
          const ref = this.dialog.open(ItemFormComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            dismissableMask: false,
            width: 'min(70rem, 95vw)',
            contentStyle: { 'max-height': '86vh', overflow: 'auto' },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((created: unknown): created is Item => created != null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((created) => {
        group.controls.item.setValue(
          toItemOption({
            id: created.id,
            codigo: created.codigo ?? undefined,
            nombre: created.nombre,
            precio: created.precio,
          }),
        );
      });
  }

  /** Enter en el input del lector: encola el código escaneado. */
  protected onScan(event: Event): void {
    const input = event.target as HTMLInputElement;
    const codigo = input.value.trim();
    if (codigo) this.scan$.next({ codigo, input });
  }

  /**
   * Resuelve un escaneo contra los ítems que `?search=` devolvió (busca por
   * nombre, código y referencia): manda la coincidencia **exacta** de código y,
   * si no la hay, un único resultado se acepta. Varios resultados sin exacto se
   * rechazan — a diferencia del legacy, que tomaba el primero: con `search`
   * barriendo también nombre y referencia, "el primero" puede ser cualquier
   * cosa, y una línea equivocada muda es peor que pedir la búsqueda manual.
   *
   * Con ítem resuelto agrega la línea y le setea la opción: de ahí en adelante
   * corre la tubería normal de una selección (precio del ítem → lista/costo →
   * impuestos). El input se limpia para el siguiente escaneo; si falla, el
   * código queda **seleccionado**: legible para la persona y listo para que el
   * próximo disparo de la pistola lo reemplace.
   */
  private applyScan(rows: readonly ItemApiRow[], codigo: string, input: HTMLInputElement): void {
    const exacto = rows.find((row) => row.codigo === codigo);
    const row = exacto ?? (rows.length === 1 ? rows[0] : undefined);
    if (!row) {
      const toasts = this.t().entities.comercialDetalle.scanner;
      const toast = rows.length > 1 ? toasts.ambiguous : toasts.notFound;
      this.toast.warn(toast.title, toast.desc);
      input.select();
      return;
    }
    this.addLinea();
    // El push emite `valueChanges` sincrónico: el efecto de arriba ya cableó la
    // fila nueva, así que setear el ítem dispara la tubería completa.
    const group = this.detalles().at(this.detalles().length - 1);
    group.controls.item.setValue(toItemOption(row));
    input.value = '';
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

  /**
   * Base gravable de la línea (`bruto − descuento`). La consume el selector de
   * impuestos para mostrar, opción por opción, cuánto le suma o resta a **esta**
   * línea elegir ese impuesto.
   */
  protected baseOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineBase(line) : 0;
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
      // Cubre las filas pobladas después de que llegó el catálogo (en edición
      // el padre las empuja al FormArray cuando responde su propia consulta).
      this.normalizarImpuestosLeidos(group);
    }
  }

  /**
   * Normaliza contra el catálogo del `modo` los impuestos que vinieron del
   * backend, en dos frentes:
   *
   *  - **Signo**: el serializer de la línea guarda `total` sin signo y (todavía)
   *    no manda la operación, así que una retención cargada en edición sumaría
   *    en vez de restar. El signo autoritativo sale del catálogo (que sí trae
   *    `operacion`). Solo toca el signo: la magnitud sigue siendo la del backend.
   *  - **Nombre**: la línea trae el nombre corto (`"IVA"`) y no el extendido
   *    (`"IVA 19% ventas"`), que es el que muestran los badges y el resumen.
   *
   * Un impuesto que no esté en el catálogo queda como llegó. Es idempotente, así
   * que puede correr al llegar el catálogo y al cablear cada fila sin pisarse.
   * Cuando el backend serialice `impuesto_operacion` e `impuesto_nombre_extendido`
   * en la línea, el mapper resolverá ambos y esto pasará a ser un no-op.
   */
  private normalizarImpuestosLeidos(group: ComercialDetalleGroup): void {
    const catalog = this.impuestosCatalog();
    if (catalog.length === 0) return;
    const tasas = new Map(catalog.map((tasa) => [tasa.id, tasa]));
    const actuales = group.controls.impuestos_totales.value;
    const normalizados = actuales.map((imp) => {
      const tasa = tasas.get(imp.id);
      if (!tasa) return imp;
      const total = Math.abs(imp.total) * ((tasa.operacion ?? 1) < 0 ? -1 : 1);
      const nombre = tasa.nombre || imp.nombre;
      return total === imp.total && nombre === imp.nombre ? imp : { ...imp, total, nombre };
    });
    if (normalizados.some((imp, i) => imp !== actuales[i])) {
      group.controls.impuestos_totales.setValue(normalizados);
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
    forkJoin({
      item: this.itemService.getById(opt.id),
      precioLista: this.consultarPrecioLista(opt.id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ item, precioLista }) => {
        this.applyPrecioPactado(group, opt, item, precioLista);
        group.controls.impuestos_ids.setValue(
          tasasDelItem(item, this.modo()).map((tasa) => tasa.id),
        );
      });
  }

  /**
   * Precio del ítem en la lista del contacto, si aplica: solo en venta (las
   * listas de precios son condición de venta; en compra manda el costo) y solo
   * si la cabecera aportó lista. Un fallo de la consulta no bloquea los
   * impuestos: cae a `null` y la línea queda con el precio del ítem.
   */
  private consultarPrecioLista(itemId: number): Observable<number | null> {
    const precioId = this.precioListaId();
    if (this.modo() !== 'venta' || precioId == null) return of(null);
    return this.precioDetalleService
      .consultarPrecioItem(precioId, itemId)
      .pipe(catchError(() => of(null)));
  }

  /**
   * Corrige el precio sembrado por el autocomplete (`opt.precio`, el precio de
   * venta del ítem — lo único que trae `seleccionar/`) con el precio **pactado**
   * que corresponda:
   *  - **venta con lista de precios del contacto** → el `vr_precio` cotizado en
   *    la lista (`consultarPrecioLista`);
   *  - **compra** → el `costo` de la lectura completa del ítem (la misma
   *    consulta de los impuestos). Un costo 0 se siembra igual — lo normal: el
   *    costo real lo dicta la factura del proveedor y lo digita la persona,
   *    como en el ERP anterior.
   *
   * Respeta un precio ya tecleado: solo pisa el valor sembrado por el
   * autocomplete, por si la persona editó el precio en la ventana entre elegir
   * el ítem y las respuestas de estas consultas.
   */
  private applyPrecioPactado(
    group: ComercialDetalleGroup,
    opt: ItemOption,
    item: Item,
    precioLista: number | null,
  ): void {
    const costo = this.modo() === 'compra' ? toFiniteNumber(item.costo) : null;
    const pactado = precioLista ?? costo;
    if (pactado == null) return;
    if (group.controls.precio.value !== opt.precio) return;
    group.controls.precio.setValue(pactado);
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

  // ── Precio con impuestos incluidos (extraer IVA) ────────────────────────────

  /** Fila cuyo popover de "precio con impuestos" está abierto. */
  private extraerIvaGroup: ComercialDetalleGroup | null = null;
  /** Valor tecleado en el popover (precio unitario final, impuestos incluidos). */
  protected readonly extraerIvaValor = signal<number | null>(null);

  /**
   * Abre el popover sembrado con el precio final que produce el precio actual
   * (así se ve de entrada cuánto vale la línea con impuestos). `ensureCatalog`
   * primero: una línea cargada en edición aún no tiene el pool de tasas y sin él
   * la inversión sería identidad muda.
   */
  protected openExtraerIva(op: Popover, event: Event, group: ComercialDetalleGroup): void {
    this.ensureCatalog(group);
    this.extraerIvaGroup = group;
    this.extraerIvaValor.set(precioUnitarioConImpuestos(group.getRawValue()));
    op.toggle(event);
  }

  /** Precio base que produciría el valor tecleado (vista previa en vivo). */
  protected extraerIvaBase(): number {
    const group = this.extraerIvaGroup;
    const valor = this.extraerIvaValor();
    if (!group || valor == null) return 0;
    return precioUnitarioSinImpuestos(valor, group.getRawValue());
  }

  /** Aplica el precio base a la línea; el recompute encadena montos y resumen. */
  protected applyExtraerIva(op: Popover): void {
    const group = this.extraerIvaGroup;
    if (!group) return;
    group.controls.precio.setValue(this.extraerIvaBase());
    op.hide();
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
