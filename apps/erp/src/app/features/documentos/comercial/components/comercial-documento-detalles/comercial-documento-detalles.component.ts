import { pendienteLineaToFormValue } from '@erp/features/documentos/comercial/pendiente-linea.mapper';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  type Observable,
  Subject,
  type Subscription,
  catchError,
  concat,
  concatMap,
  defer,
  filter,
  finalize,
  forkJoin,
  from,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
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
  ITEM_SELECCIONAR_ENDPOINT,
  toItemOption,
  type ItemApiRow,
  type ItemOption,
  ItemService,
  PrecioDetalleService,
  type Item,
  comercialDetalleToFormValue,
  comercialDetalleToPayload,
  precioUnitarioConImpuestos,
  precioUnitarioSinImpuestos,
  lineBase,
  lineBruto,
  lineNeto,
  tasasDelItem,
  toLineaCalculo,
  type ComercialDetalleRead,
  type ComercialDetalleFormRawValue,
} from '@reddoc/core';
import {
  DocumentoDetalleService,
  type ImportarDocumentoModalData,
  type LineaPendienteApi,
} from '@erp/core/module-config';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { ErpItemAutocompleteComponent } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ErpImpuestoSelectComponent } from '@erp/core/components/impuesto-select/erp-impuesto-select.component';
import {
  IMPUESTO_SELECCIONAR_ENDPOINT,
  tasaFromImpuestoOption,
  type ImpuestoSeleccionarOption,
} from '@erp/core/components/impuesto-select/impuesto-seleccionar.types';
import { ErpSelectDataService, SELECT_ENDPOINTS, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { LineasEnCursoError } from '../../comercial-documento-detalle.errors';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '../../comercial-documento-detalle.form';
import { aiuLineaToFormValue, type AiuLinea } from '../../aiu';

/**
 * Líneas que se escriben a la vez al guardar. Acota la ráfaga contra el backend en
 * documentos con muchas líneas (una importación grande) sin serializarlas todas.
 */
const GUARDADOS_EN_PARALELO = 4;

/** Cómo terminó una operación de `saveAll()`: el lote junta todas antes de decidir. */
type ResultadoGuardado = { readonly ok: true } | { readonly ok: false; readonly err: unknown };

/** Toast con que cierra un agregado de líneas (importar desde documento, AIU). */
interface ToastTexto {
  readonly title: string;
  readonly desc: string;
}

/**
 * Tabla de **líneas (detalles)** de un documento comercial. Reutilizable por
 * todos los documentos comerciales (factura venta/compra, notas): recibe el
 * `FormArray` del form padre y lo edita **inline** (grid de factura).
 *
 * El cálculo por línea (subtotal/impuesto/neto) y el resumen del documento se
 * derivan del valor del array vía el kernel `@reddoc/core/calculo`. La tabla es
 * agnóstica al tipo de documento.
 *
 * Persistencia: en **alta** (`documentId == null`) las líneas viven en el
 * `FormArray` y viajan embebidas al crear el documento. En **edición** el backend
 * no acepta las líneas en el PUT del documento —van por `/documento-detalle`—, pero
 * la tabla no guarda nada por su cuenta: altas, ediciones, bajas, importadas y AIU
 * quedan pendientes en memoria y las persiste `saveAll()` cuando el form padre
 * guarda el documento. Un solo botón "Guardar" confirma todo; "Volver" lo descarta.
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
    ErpApiSelectComponent,
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
   * Id del documento en edición (`null` en alta). Cuando existe, los cambios de las
   * líneas quedan pendientes y los persiste `saveAll()` contra `/documento-detalle`.
   */
  readonly documentId = input<number | null>(null);

  /**
   * Habilita el botón "importar desde documento". Lo activa cada documento que
   * soporte importar líneas pendientes (p. ej. factura de venta).
   */
  readonly importEnabled = input<boolean>(false);

  /**
   * Habilita la opción **AIU** del botón "Agregar línea": agrega el valor base y
   * sus líneas de administración, imprevisto y utilidad. Solo la factura de venta.
   */
  readonly aiuEnabled = input<boolean>(false);

  /**
   * Contacto del documento actual (de la cabecera del form padre). Acota las
   * líneas pendientes del modal de importación a ese contacto.
   */
  readonly contactoId = input<number | null>(null);

  /**
   * Tipo del documento origen del que se importan líneas (`DOCUMENT_TYPE_ID`).
   * `null` = el modal no filtra por tipo y trae pendientes de cualquier documento.
   */
  readonly importDocumentoTipoId = input<number | null>(null);

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
   * Muestra la columna **Almacén** (el almacén por línea), a la derecha de ítem.
   * Default `false`: solo la declara el documento que la necesita. El documento
   * que la encienda aquí debería encenderla también en la tabla de solo lectura
   * de su ficha, para que se vea lo mismo que se editó.
   */
  readonly almacenEnabled = input<boolean>(false);

  /** Catálogo del select de almacén de la línea. */
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;

  /**
   * Almacén de la cabecera, para precargarlo en cada línea nueva (incluidas las
   * que entran por el lector de código de barras). Lo pasa el documento que tiene
   * almacén general; la persona cambia después las líneas que sean la excepción.
   * No toca las líneas ya creadas ni las que llegan en edición con su almacén.
   */
  readonly almacenPorDefecto = input<ErpSelectOption | null>(null);

  /**
   * Muestra la columna **Detalle** (la nota libre por línea). Default `true`.
   *
   * Hay documentos donde esa nota no aplica y la columna solo roba ancho a las
   * que sí importan —la remisión, por ejemplo—; ahí el documento la apaga. El
   * control `detalle` del `FormGroup` sigue existiendo y viajando en el payload
   * con su valor actual: esto es visibilidad de la tabla, no un cambio del
   * contrato de la línea.
   */
  readonly detalleEnabled = input<boolean>(true);

  /**
   * Columnas de la tabla, para el `colspan` del estado vacío: 9 fijas más las
   * opcionales que el documento haya encendido.
   */
  protected readonly columnCount = computed(
    () => 9 + (this.detalleEnabled() ? 1 : 0) + (this.almacenEnabled() ? 1 : 0),
  );

  /** Importación en curso; bloquea el botón mientras resuelve los ítems. */
  protected readonly importing = signal(false);

  /**
   * Acciones del dropdown del botón "Agregar línea" (SplitButton), según lo que
   * el documento encienda: "importar desde documento" (se deshabilita sin
   * contacto, que acota las pendientes) y "AIU".
   */
  protected readonly addLineMenu = computed<MenuItem[]>(() => [
    ...(this.importEnabled()
      ? [
          {
            label: this.t().documentImport.buttonLabel,
            icon: 'pi pi-file-import',
            disabled: this.contactoId() === null,
            command: () => this.openImport(),
          },
        ]
      : []),
    ...(this.aiuEnabled()
      ? [
          {
            label: this.t().entities.comercialDetalle.aiu.menuLabel,
            icon: 'pi pi-percentage',
            command: () => this.openAiu(),
          },
        ]
      : []),
  ]);

  /** Espejo reactivo del valor del array para la tabla, los totales y el resumen. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);

  /** Hay al menos una línea: la página pinta el resumen solo entonces. */
  readonly hayLineas = computed(() => this.lines().length > 0);

  /**
   * Resumen del documento: subtotal, desglose por impuesto y total.
   * Público: la página lo pinta fuera de la card de líneas, leyéndolo por
   * referencia de plantilla (`#detallesTabla`).
   */
  readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Guardado de las líneas (flush del form padre al guardar el documento) en curso. */
  protected readonly savingAll = signal(false);

  /**
   * Ids de líneas persistidas que la persona quitó en edición. La fila sale de la
   * tabla al instante (y del total), pero el `DELETE` espera al guardado del
   * documento: salir sin guardar las conserva.
   */
  private readonly eliminadas = signal<readonly number[]>([]);

  /**
   * Hay un guardado o una importación en curso. El form padre deshabilita "Guardar"
   * mientras tanto: guardar a la vez reenviaría líneas que aún no tienen `id`.
   */
  readonly ocupado = computed(() => this.savingAll() || this.importing());

  /**
   * `true` desde que el effect de sincronización corrió, es decir, con los inputs ya
   * asignados. El form padre pide `pendingCount()` desde su barra de acciones, que se
   * evalúa antes que esta tabla (va más abajo en la plantilla): leer el input
   * obligatorio en ese momento lanza NG0950. Al montar no hay nada pendiente.
   */
  private readonly montada = signal(false);

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
      this.montada.set(true);
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
          for (const group of this.detalles().controls) this.seedRow(group);
        },
        error: () => {
          // Sin catálogo, las líneas conservan los montos del ítem/backend.
        },
      });
  }

  protected addLinea(): void {
    this.detalles().push(createComercialDetalleGroup(undefined, this.almacenPorDefecto()));
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
        // Un `setValue` no ensucia: sin esto, en una línea ya guardada el cambio de
        // ítem no cuenta como pendiente y "Guardar" no lo envía.
        group.controls.item.markAsDirty();
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
    // Mientras se guarda no se agregan líneas: quedarían fuera del lote en vuelo.
    if (this.ocupado()) return;
    const data: ImportarDocumentoModalData = {
      contactoId: this.contactoId(),
      documentoTipoId: this.importDocumentoTipoId(),
    };

    from(
      import('@erp/core/module-config/importar-documento/components/importar-documento-modal/importar-documento-modal.component'),
    )
      .pipe(
        switchMap(({ ImportarDocumentoModalComponent }) => {
          const ref = this.dialog.open(ImportarDocumentoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '80rem',
            breakpoints: { '1360px': '95vw', '640px': '92vw' },
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
   * trae item/precio/impuestos, no hace falta lectura extra) y las agrega.
   */
  private resolveAndAdd(rows: readonly LineaPendienteApi[]): void {
    this.agregarLineas(
      rows.map(pendienteLineaToFormValue),
      this.t().documentImport.toasts.addSuccess,
    );
  }

  /**
   * Abre el modal **AIU** (lazy) y, con las 4 líneas que devuelve (base,
   * administración, imprevisto, utilidad), lee cada ítem para sus impuestos de
   * venta y las agrega. El modal solo calcula; aquí se resuelve.
   */
  protected openAiu(): void {
    if (this.ocupado()) return;
    from(import('../aiu-modal/aiu-modal.component'))
      .pipe(
        switchMap(({ AiuModalComponent }) => {
          const ref = this.dialog.open(AiuModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            // Un clic afuera no debe descartar un AIU a medio digitar.
            dismissableMask: false,
            width: '46rem',
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((lineas: unknown): lineas is AiuLinea[] => Array.isArray(lineas)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lineas) => this.resolveAiu(lineas));
  }

  /**
   * Lee los ítems del AIU en paralelo y arma sus líneas con el precio calculado
   * (sin pasar por la selección de la tabla, que lo pisaría con la lista de
   * precios del contacto; ver `aiuLineaToFormValue`).
   */
  private resolveAiu(lineas: readonly AiuLinea[]): void {
    const toasts = this.t().entities.comercialDetalle.aiu.toasts;
    this.importing.set(true);
    forkJoin(lineas.map((linea) => this.itemService.getById(linea.item.id)))
      .pipe(
        finalize(() => this.importing.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) =>
          this.agregarLineas(
            items.map((item, i) => aiuLineaToFormValue(item, lineas[i].precio)),
            toasts.success,
          ),
        error: () => this.toast.error(toasts.error.title, toasts.error.desc),
      });
  }

  /**
   * Agrega líneas ya resueltas (importadas o del AIU) al `FormArray`. En alta viajan
   * al crear el documento; en edición quedan pendientes (sin `id`) y las persiste el
   * guardado del documento. No se escriben aparte: hacerlo obligaba a recargar el
   * documento y eso pisaba los cambios sin guardar de la cabecera y de otras líneas.
   *
   * La línea que llega sin almacén hereda el de la cabecera, igual que una
   * agregada a mano (`almacenPorDefecto`).
   */
  private agregarLineas(lineas: readonly ComercialDetalleFormRawValue[], exito: ToastTexto): void {
    const almacen = this.almacenPorDefecto();
    for (const linea of lineas) {
      const value = linea.almacen == null && almacen != null ? { ...linea, almacen } : linea;
      this.detalles().push(createComercialDetalleGroup(value));
    }
    this.toast.success(exito.title, exito.desc);
  }

  /**
   * Reemplaza **todas** las líneas por `values` (p. ej. las de la factura que
   * referencia una nota). La confirmación es del llamador. En edición las líneas
   * persistidas pasan a `eliminadas` y las nuevas quedan pendientes: todo se
   * escribe al guardar el documento, y salir sin guardar deja la nota como estaba.
   */
  reemplazarLineas(values: readonly ComercialDetalleFormRawValue[]): void {
    if (this.documentId() != null) {
      const ids = this.detalles()
        .getRawValue()
        .map((line) => line.id)
        .filter((id): id is number => id != null);
      this.eliminadas.update((actuales) => [...actuales, ...ids]);
    }
    this.detalles().clear();
    for (const value of values) this.detalles().push(createComercialDetalleGroup(value));
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

  /**
   * Nº de cambios sin guardar: filas nuevas o editadas más las quitadas. Alimenta el
   * aviso del toolbar, el del form padre y el guard de salida.
   */
  pendingCount(): number {
    if (!this.montada()) return 0;
    return this.pendingRows().length + this.eliminadas().length;
  }

  /** `true` si alguna línea pendiente está incompleta (p. ej. sin ítem). */
  hasInvalidPending(): boolean {
    return this.pendingRows().some((row) => row.invalid);
  }

  /**
   * Persiste una línea (PATCH si ya tiene `id`, POST con `documento_id` si es
   * nueva) y la reconstruye desde la respuesta autoritativa del backend
   * (impuestos y montos recalculados). Reconstruida, deja de estar pendiente.
   *
   * Si la fila cambió mientras la petición viajaba (la persona siguió tecleando, o
   * llegó tarde el precio o los impuestos de un ítem), no se reconstruye: pisaría lo
   * nuevo. Solo toma el `id` —para que el próximo guardado sea un PATCH y no otra
   * alta— y queda pendiente con lo que muestra la pantalla.
   */
  private persistRow(
    group: ComercialDetalleGroup,
    documentoId: number,
  ): Observable<ComercialDetalleRead> {
    const payload = comercialDetalleToPayload(group.getRawValue());
    const enviado = JSON.stringify(payload);
    const id = group.controls.id.value;
    const op =
      id != null
        ? this.detalleService.actualizar<ComercialDetalleRead>(id, payload)
        : this.detalleService.crear<ComercialDetalleRead>(documentoId, payload);
    return op.pipe(
      tap((saved) => {
        const leida = comercialDetalleToFormValue(saved);
        if (JSON.stringify(comercialDetalleToPayload(group.getRawValue())) !== enviado) {
          group.controls.id.setValue(leida.id);
          group.markAsDirty();
          return;
        }
        const index = this.detalles().controls.indexOf(group);
        if (index >= 0) this.detalles().setControl(index, createComercialDetalleGroup(leida));
      }),
    );
  }

  /**
   * Borra una línea quitada y la saca de `eliminadas`. Un 404 cuenta como hecho: la
   * línea ya no existe (p. ej. la borró un intento anterior cuya respuesta se perdió).
   */
  private persistBaja(id: number): Observable<void> {
    const hecho = (): void => this.eliminadas.update((ids) => ids.filter((x) => x !== id));
    return this.detalleService.eliminar(id).pipe(
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
   * Persiste todos los cambios pendientes: primero las bajas, después las altas y
   * ediciones válidas. Lo llama el form padre al guardar el documento, antes de la
   * cabecera; completa cuando todo quedó escrito y emite error si algo falló.
   *
   * **Reintentable sin duplicar.** Cada operación corre hasta el final aunque otra
   * falle (no se cancela nada en vuelo: una petición cancelada puede haber llegado
   * al backend y el reintento la duplicaría). Lo que se guardó deja de estar
   * pendiente —la fila se reconstruye con su `id`, la baja sale de `eliminadas`—,
   * así que volver a guardar solo envía lo que faltó. El backend no ofrece un
   * guardado atómico de documento + líneas.
   *
   * Límite: si un POST llega al backend pero su respuesta se pierde (corte de red),
   * la fila queda sin `id` y el reintento la crea otra vez. Evitarlo pide una clave
   * de idempotencia del lado del backend; desde aquí solo se minimiza no cancelando.
   *
   * Operación pura: no muestra toasts (el feedback es del caller).
   */
  saveAll(): Observable<void> {
    // `defer`: el flag de carga y las peticiones se atan al `subscribe`, no a la
    // llamada, y las filas se evalúan en el momento de ejecutar.
    return defer(() => {
      if (this.ocupado()) return throwError(() => new LineasEnCursoError());
      const documentoId = this.documentId();
      if (documentoId == null) return of(undefined);
      const bajas = [...this.eliminadas()];
      const filas = this.pendingRows().filter((row) => row.valid);
      if (bajas.length === 0 && filas.length === 0) return of(undefined);

      // Cada operación entrega su resultado en vez de cortar el lote con su error.
      const resultado = (op: Observable<unknown>): Observable<ResultadoGuardado> =>
        op.pipe(
          map((): ResultadoGuardado => ({ ok: true })),
          catchError((err: unknown) => of<ResultadoGuardado>({ ok: false, err })),
        );

      this.savingAll.set(true);
      return concat(
        from(bajas).pipe(concatMap((id) => resultado(this.persistBaja(id)))),
        from(filas).pipe(
          mergeMap((row) => resultado(this.persistRow(row, documentoId)), GUARDADOS_EN_PARALELO),
        ),
      ).pipe(
        toArray(),
        switchMap((resultados) => {
          const fallo = resultados.find((r) => !r.ok);
          return fallo && !fallo.ok ? throwError(() => fallo.err) : of(undefined);
        }),
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
      this.seedRow(group);
    }
  }

  /**
   * Normaliza contra el catálogo del `modo` los impuestos que vinieron del
   * backend, en dos frentes:
   *
   *  - **Nombre**: la línea trae el nombre corto (`"IVA"`) y no el extendido
   *    (`"IVA 19% ventas"`), que es el que muestran los badges y el resumen. Es
   *    lo único que este paso aporta hoy; mientras el serializer de la línea no
   *    mande `impuesto_nombre_extendido`, la ficha de detalle —que no consulta
   *    el catálogo— sigue mostrando el corto.
   *  - **Signo**: redundante desde que la línea serializa `impuesto_operacion`
   *    (el mapper ya lo aplica), pero se conserva porque el catálogo es la
   *    fuente autoritativa y cuesta nada. Solo toca el signo: la magnitud sigue
   *    siendo la del backend.
   *
   * Un impuesto que no esté en el catálogo queda como llegó. Es idempotente, así
   * que puede correr al llegar el catálogo y al cablear cada fila sin pisarse.
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
  private ensureCatalog(group: ComercialDetalleGroup, emitEvent = true): void {
    const catalog = this.impuestosCatalog();
    if (catalog.length === 0) return;
    if (group.controls.impuestos_disponibles.value.length > 0) return;
    group.controls.impuestos_disponibles.setValue(catalog, { emitEvent });
  }

  /**
   * Deja una fila lista para calcular: le siembra el pool de tasas y normaliza
   * los impuestos que vinieron del backend.
   *
   * Sin el pool, el recompute de la línea (`createComercialDetalleGroup`) se
   * corta de entrada, y una línea **cargada en edición** nace con el pool vacío:
   * tocarle el descuento (o la cantidad, o el precio) movía la base pero dejaba
   * el impuesto y el neto en el valor viejo hasta re-elegir el ítem.
   *
   * En las filas cargadas se siembra **sin emitir**: al abrir el documento se
   * conservan los montos que calculó el backend; el recálculo entra recién
   * cuando la persona edita algo. Es idempotente y no cuesta red — el catálogo
   * ya está en memoria.
   */
  private seedRow(group: ComercialDetalleGroup): void {
    this.ensureCatalog(group, group.controls.id.value == null);
    this.normalizarImpuestosLeidos(group);
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
    // Igual que al crear ítem: el precio aplicado lo pidió la persona y debe guardarse.
    group.controls.precio.markAsDirty();
    op.hide();
  }

  /**
   * Quita la fila. Si ya existe en el backend (edición), su id pasa a `eliminadas`
   * y el `DELETE` se hace al guardar el documento.
   */
  private deleteLinea(group: ComercialDetalleGroup, id: number | null): void {
    if (this.documentId() != null && id != null) {
      this.eliminadas.update((ids) => [...ids, id]);
    }
    this.removeGroup(group);
  }

  /** Quita un grupo del `FormArray` por su referencia (robusto ante reordenamientos). */
  private removeGroup(group: ComercialDetalleGroup): void {
    const i = this.detalles().controls.indexOf(group);
    if (i >= 0) this.detalles().removeAt(i);
  }
}
