import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
  MascaraFechaDirective,
} from '@reddoc/ui';
import {
  DOCUMENT_TYPE_ID,
  FormErrorService,
  I18nService,
  calcularResumen,
  startOfToday,
  TenantService,
  ToastService,
  precioListaDeContacto,
  comercialDetalleToFormValue,
  toLineaCalculo,
  totalCantidad,
  type ComercialDetalleRead,
  type ComercialDetalleFormRawValue,
  type PagoRead,
  DocumentoPagoService,
  calcularPagos,
  type ResumenDocumento,
  cantidadDesdeCabecera,
  resumenDesdeCabecera,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { ErpApiSelectComponent, ErpAsesorSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import {
  ErpSelectDataService,
  RESOLUCION_ACTIVA_PARAMS,
  SELECT_ENDPOINTS,
  resolucionLabel,
} from '@reddoc/core';
import {
  DocumentoDetalleService,
  ENTITY_DATA_GATEWAY,
  extractDocumentoId,
} from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import {
  canLeaveDocumentForm,
  hayCambiosSinGuardar,
  type CambiosDocumento,
} from '@erp/core/guards/leave-document-form';
import { CambiosSinGuardarComponent } from '@erp/features/documentos/components/cambios-sin-guardar/cambios-sin-guardar.component';
import type { AppDict } from '@erp/i18n';
import {
  METODO_PAGO_ENDPOINT,
  METODO_PAGO_NO_DEFINIDO,
  RESOLUCION_ENDPOINT,
  SEDE_ENDPOINT,
} from '../../factura-venta.constants';
import { setupPlazoPagoDesdeContacto } from '@erp/features/documentos/comercial/plazo-pago-contacto';
import {
  setupVencimientoAutocompute,
  type VencimientoAutocompute,
} from '@erp/features/documentos/comercial/vencimiento-autocompute';
import { VencimientoHintComponent } from '@erp/features/documentos/comercial/components/vencimiento-hint/vencimiento-hint.component';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import { reemplazarFilas } from '@erp/features/documentos/form-array-filas';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { DocumentoPagosComponent } from '@erp/features/documentos/pagos/components/documento-pagos/documento-pagos.component';
import {
  guardarTablasEnSerie,
  pestanaConPrimerError,
  registrarPagosDeAlta,
  type TablaEnVivoDocumento,
} from '@erp/features/documentos/tablas-en-vivo';
import { createPagoGroup, type PagoGroup } from '@erp/features/documentos/pagos/pago.form';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import type { PagoFormRawValue } from '@erp/features/documentos/pagos/pago.form';
import { facturaVentaToFormValue, formValueToPayload } from '../../factura-venta.mapper';
import type { FacturaVentaRead } from '../../factura-venta.model';
import { MasInformacionComponent } from '@erp/features/documentos/components/mas-informacion/mas-informacion.component';
import { CrearTerceroDirective } from '@erp/features/general/masters/contacto/crear-tercero.directive';

/**
 * Formulario de alta/edición de la **cabecera** de una Factura de venta.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista. El HTTP se
 * delega en `ENTITY_DATA_GATEWAY`.
 *
 * A diferencia de la familia *servicio*, la cabecera comercial es específica de
 * cada documento (los campos de una factura ≠ los de una nota débito): por eso
 * este form vive dentro de `factura-venta/` y no en un _shared. La **tabla de
 * detalles** y la **sección de pagos** —compartidas entre documentos— van en
 * tabs dentro de la misma card de la cabecera, cada una recibiendo su `FormArray`.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-factura-venta-form',
  standalone: true,
  imports: [
    CambiosSinGuardarComponent,
    MasInformacionComponent,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    MascaraFechaDirective,
    TabsModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpContactoSelectComponent,
    CrearTerceroDirective,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    InputTextModule,
    TextareaModule,
    ComercialDocumentoDetallesComponent,
    DocumentoPagosComponent,
    ComercialDocumentoResumenComponent,
    VencimientoHintComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './factura-venta-form.component.html',
  styleUrl: './factura-venta-form.component.scss',
})
export class FacturaVentaFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly pagoService = inject(DocumentoPagoService);

  protected readonly t = this.i18n.t;

  /** Tabla de líneas: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  /** Tabla de pagos: en edición se guarda con el documento; en alta registra los pagos al crear. */
  private readonly pagosTable = viewChild(DocumentoPagosComponent);

  /** Guardado en curso en la tabla de líneas o la de pagos: el botón Guardar espera a que termine. */
  protected readonly tablasOcupadas = computed(
    () => (this.detallesTable()?.ocupado() ?? false) || (this.pagosTable()?.ocupado() ?? false),
  );

  /** Tab activo del bloque de líneas (Detalles / Pagos). */
  protected readonly activeTab = signal<'detalles' | 'pagos'>('detalles');

  /**
   * Control del form → pestaña que lo contiene, en orden de pantalla. Al guardar con
   * errores se abre la del primero, para que `libFocusInvalid` pueda llevar al campo.
   */
  private readonly pestanasPorControl: Readonly<Record<string, 'detalles' | 'pagos'>> = {
    detalles: 'detalles',
    pagos: 'pagos',
  };

  /** La factura de venta importa líneas pendientes solo de remisiones. */
  protected readonly importDocumentoTipoId = DOCUMENT_TYPE_ID.REMISION;
  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly resolucionEndpoint = RESOLUCION_ENDPOINT;
  protected readonly resolucionLabel = resolucionLabel;

  /** Solo resoluciones de venta, como el ERP anterior (la de compra es del documento soporte). */
  protected readonly resolucionParams = { ...RESOLUCION_ACTIVA_PARAMS, venta: 'True' } as const;

  /** Filtra el autocomplete de contacto a clientes. */
  protected readonly contactoParams = { cliente: 'True' } as const;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  /**
   * Cabecera pre-cargada por `editableDocumentResolver` (clave de ruta
   * `documentoEdit`). En edición llega ya resuelta y el form la reúsa en vez de
   * volver a pedirla; `null`/ausente en alta o si el resolver hizo fail-open.
   */
  readonly documentoEdit = input<unknown>();

  protected readonly isEditMode = computed(() => !!this.id());

  /**
   * En alta, sede y almacén auto-seleccionan la primera opción (como el
   * legacy): lo habitual es tener una sola. En edición manda la del documento.
   */
  protected readonly primeraSugerida = computed(() => (this.isEditMode() ? null : 0));

  /**
   * En alta, el método de pago sugiere "Instrumento no definido". Se busca por
   * su código DIAN (`1`), no por posición: el catálogo no llega en ese orden.
   */
  protected readonly metodoPagoSugerido = computed(() =>
    this.isEditMode()
      ? null
      : (option: ErpSelectOption) => option['codigo'] === METODO_PAGO_NO_DEFINIDO,
  );

  /** Id del documento como número (`null` en alta); alimenta la transacción por línea. */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });
  protected readonly isSaving = signal(false);

  /** Espejo reactivo de las líneas para calcular el total del documento. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);

  /** Resumen del documento: lo pinta el aside bajo los tabs, igual en Detalles y Pagos. */
  protected readonly resumen = computed(
    () => this.detallesTable()?.resumen() ?? calcularResumen(this.lines().map(toLineaCalculo)),
  );

  /** Total del documento: contra él se validan y se prellenan los pagos. */
  protected readonly totalGeneral = computed(() => this.resumen().total);

  /** Suma de cantidades de las líneas (fila «Total cantidad» del resumen). */
  protected readonly cantidadTotal = computed(
    () => this.detallesTable()?.cantidadTotal() ?? totalCantidad(this.lines()),
  );

  /** Espejo reactivo de los pagos para el resumen y la validación del guardado. */
  protected readonly pagosLines = signal<readonly PagoFormRawValue[]>([]);

  /** Recibido, saldo y exceso de los pagos frente al total. */
  protected readonly pagosResumen = computed(() =>
    calcularPagos(this.pagosLines(), this.totalGeneral()),
  );

  /**
   * `true` cuando lo recibido supera el total. No bloquea guardar —el backend lo frena
   * al aprobar—: tiñe la pestaña y el resumen avisa que no se podrá aprobar.
   */
  protected readonly pagosExceden = computed(() => this.pagosResumen().excede);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    documentoBreadcrumb(
      this.activeModule,
      this.t(),
      this.tenant.currentSlug(),
      this.i18n.translate(this.document().displayNameKey),
      this.document().id,
      this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
    ),
  );

  protected readonly form = this.fb.group({
    contacto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(startOfToday(), Validators.required),
    fecha_vence: this.fb.control<Date | null>(null, Validators.required),
    plazo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    sede: this.fb.control<ErpSelectOption | null>(null),
    almacen: this.fb.control<ErpSelectOption | null>(null),
    metodo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    // Más información: opcionales, con el largo que acepta el backend.
    orden_compra: this.fb.control<string | null>(null, Validators.maxLength(50)),
    remision: this.fb.control<string | null>(null, Validators.maxLength(50)),
    asesor: this.fb.control<ErpSelectOption | null>(null),
    resolucion: this.fb.control<ErpSelectOption | null>(null),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    pagos: new FormArray<PagoGroup>([]),
  });

  /**
   * Estado del vencimiento (días del plazo, fecha que dicta y desvío), para que
   * `<app-vencimiento-hint>` explique bajo el campo de dónde salió la fecha.
   */
  protected readonly vencimiento: VencimientoAutocompute;

  constructor() {
    // Autocálculo del vencimiento (fecha + días del plazo). Editable salvo en
    // contado, donde vence el mismo día de la emisión y el campo se bloquea.
    this.vencimiento = setupVencimientoAutocompute({
      fecha: this.form.controls.fecha,
      plazoPago: this.form.controls.plazo_pago,
      fechaVence: this.form.controls.fecha_vence,
      selectData: this.selectData,
      destroyRef: this.destroyRef,
      endpoint: this.plazoPagoEndpoint,
      bloquearEnContado: true,
    });

    // Al elegir cliente, adopta su plazo de pago pactado. Cambiar el plazo
    // dispara el autocálculo de arriba, que reajusta la fecha de vencimiento. En
    // edición no aplica: `applyCabecera` puebla con `emitEvent: false`.
    setupPlazoPagoDesdeContacto({
      contacto: this.form.controls.contacto,
      plazoPago: this.form.controls.plazo_pago,
      origen: 'cliente',
      destroyRef: this.destroyRef,
    });

    // Espejo reactivo de las líneas para el total del documento.
    this.form.controls.detalles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.lines.set(this.form.controls.detalles.getRawValue()));

    // Espejo reactivo de los pagos para el resumen y la validación del guardado.
    this.form.controls.pagos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pagosLines.set(this.form.controls.pagos.getRawValue()));
  }

  /** Getter tipado del `FormArray` de pagos (para el chip de la pestaña). */
  protected get pagos(): FormArray<PagoGroup> {
    return this.form.controls.pagos;
  }

  /** Lista de precios del cliente elegido; cotiza cada ítem de la tabla de líneas. */
  protected precioListaId(): number | null {
    return precioListaDeContacto(this.form.controls.contacto.value);
  }

  /**
   * Resumen y suma de cantidades que calculó el backend con todas las líneas
   * guardadas, leídos de la cabecera en edición; `null` en alta.
   */
  protected readonly resumenBase = signal<ResumenDocumento | null>(null);
  protected readonly cantidadBase = signal<number | null>(null);

  /**
   * La tabla pagina sus líneas solo si la cabecera trae el resumen y la suma de
   * cantidades (`cantidad_detalles`, para «Total cantidad»). Si faltara alguno
   * se traen todas las líneas, como antes.
   */
  protected readonly paginada = computed(
    () => this.resumenBase() !== null && this.cantidadBase() !== null,
  );

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as FacturaVentaRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.isSaving() || this.tablasOcupadas()) return;
    if (this.form.invalid || this.form.pending) {
      // `libFocusInvalid` marca todo como tocado y lleva al primer campo con error, pero
      // un panel inactivo está oculto: antes se abre la pestaña que lo contiene.
      const pestana = pestanaConPrimerError(this.form, this.pestanasPorControl);
      if (pestana) this.activeTab.set(pestana);
      return;
    }

    const id = this.id();
    if (!id) {
      // Alta: las líneas viajan embebidas; los pagos se registran al crear.
      this.isSaving.set(true);
      this.persistCabecera(id);
      return;
    }

    // Edición: líneas y pagos transaccionan aparte, así que antes de guardar el
    // documento se persisten sus pendientes (el form ya es válido: no hay incompletos).
    const tablas = this.tablasEnVivo();

    this.isSaving.set(true);
    // Flush silencioso y en serie (líneas, luego pagos): el éxito lo confirma el toast
    // del documento; el helper solo reporta la tabla que falle.
    guardarTablasEnSerie(tablas, this.toast)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => this.persistCabecera(id),
        error: () => this.isSaving.set(false),
      });
  }

  /** Tablas que se guardan aparte del documento, en el orden en que se guardan. */
  private tablasEnVivo(): readonly TablaEnVivoDocumento[] {
    const { comercialDetalle, documentoPago } = this.t().entities;
    return [
      { tabla: this.detallesTable(), errorAlGuardar: comercialDetalle.toasts.lineSaveError },
      {
        tabla: this.pagosTable(),
        errorAlGuardar: documentoPago.toasts.saveError,
      },
    ];
  }

  /** Guarda la cabecera (create/update). Asume `isSaving` ya en `true`. */
  private persistCabecera(id: string | undefined): void {
    const toasts = this.t().entities.facturaVenta.form.toasts;
    // En edición se omiten los detalles del payload: van por `documento-detalle` y ya
    // los guardó `saveAll()` de la tabla.
    const payload = formValueToPayload(
      this.form.getRawValue(),
      this.document().documentTypeId,
      !id,
    );
    const operation = id
      ? this.gateway.update(this.document(), Number(id), payload)
      : this.gateway.create(this.document(), payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        // Guardar limpia el estado "sucio": navegar a la ficha pasa por el guard
        // de salida y, sin esto, el camino feliz preguntaría por cambios ya guardados.
        this.form.markAsPristine();
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Guardar termina en la ficha del documento, para revisar lo que quedó
        // almacenado. En alta el id sale de la respuesta del backend; si no
        // viniera, se cae a la lista antes que navegar a una URL inválida.
        const savedId = id ?? extractDocumentoId(saved);
        if (savedId == null) {
          this.isSaving.set(false);
          this.navigateToList();
          return;
        }
        // Alta: los pagos no viajan embebidos, se registran contra el documento recién
        // creado. Si alguno falla el documento ya existe: el helper avisa con el motivo
        // del backend y se abre igual su ficha, desde donde se edita para agregarlos.
        registrarPagosDeAlta(
          id ? undefined : this.pagosTable(),
          Number(savedId),
          this.toast,
          this.t().entities.documentoPago.toasts.noRegistrados,
        )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            complete: () => {
              this.isSaving.set(false);
              this.navigateToDetail(savedId);
            },
          });
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    this.navigateToList();
  }

  /** Lo que se perdería al salir; lo leen el guard de salida y el aviso junto a "Guardar". */
  private cambios(): CambiosDocumento {
    return {
      form: this.form,
      pendingLines:
        (this.detallesTable()?.pendingCount() ?? 0) + (this.pagosTable()?.pendingCount() ?? 0),
      // En edición los pagos transaccionan aparte, como las líneas: los cuenta `pendingLines`.
      lineControls: ['detalles', 'pagos'],
      // En alta nada persiste aparte: tocar una línea o un pago y salir también pierde trabajo.
      enAlta: !this.id(),
    };
  }

  /** Aviso "Cambios sin guardar" junto al botón. En alta todo está por guardar: no se muestra. */
  protected hayCambios(): boolean {
    return this.isEditMode() && hayCambiosSinGuardar(this.cambios());
  }

  /**
   * Guard de salida: si hay cambios sin guardar (cabecera o líneas), confirma antes
   * de abandonar. Guardar el documento persiste todo y deja el form limpio, así que
   * el camino feliz no pregunta.
   */
  canDeactivate(): boolean | Observable<boolean> {
    return canLeaveDocumentForm({
      ...this.cambios(),
      confirmation: this.confirmation,
      labels: this.t().entities.comercialDetalle,
      cancelLabel: this.t().common.actions.cancel,
    });
  }

  /**
   * Carga completa (cabecera + líneas). La cabecera (`documento/:id/`) ya no
   * embebe los detalles: las líneas se traen aparte de
   * `documento-detalle/?documento_id=`. Se usa como fallback de la carga inicial
   * (si el resolver no pre-cargó la cabecera).
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      pagos: this.pagoService.listarPorDocumento(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, pagos }) => {
          this.applyCabecera(cabecera as FacturaVentaRead);
          this.populatePagos(pagos);
          if (!this.paginada()) this.loadTodasLasLineas(id);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /**
   * Carga los pagos y, si la tabla no pagina, todas las líneas (la cabecera ya la
   * aportó el resolver). Paginada, las líneas las trae la tabla.
   */
  private loadLineas(id: number): void {
    forkJoin({
      lineas: this.paginada()
        ? of(null)
        : this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      pagos: this.pagoService.listarPorDocumento(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lineas, pagos }) => {
          if (lineas) this.populateLineas(lineas);
          this.populatePagos(pagos);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Todas las líneas, para cuando la tabla no pagina (ver `paginada`). */
  private loadTodasLasLineas(id: number): void {
    this.detalleService
      .listarPorDocumento<ComercialDetalleRead>(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lineas) => this.populateLineas(lineas),
        error: () => this.notifyLoadError(),
      });
  }

  /**
   * Pobla la cabecera en el form. `emitEvent: false`: no disparar el autocálculo
   * y respetar el vencimiento que viene del backend. Los pagos no vienen en la
   * cabecera: se traen de `documento-pago` junto con las líneas.
   */
  private applyCabecera(read: FacturaVentaRead): void {
    this.form.patchValue(facturaVentaToFormValue(read), { emitEvent: false });
    this.resumenBase.set(resumenDesdeCabecera(read));
    this.cantidadBase.set(cantidadDesdeCabecera(read));
    // El patch silencioso no avisa al autocálculo: el contado se reevalúa a mano.
    this.vencimiento.sincronizar();
  }

  /** Reemplaza el `FormArray` de pagos con los del backend (anulados incluidos, de solo lectura). */
  private populatePagos(pagos: readonly PagoRead[]): void {
    const arr = this.form.controls.pagos;
    arr.clear();
    for (const pago of pagos) arr.push(createPagoGroup(pagoReadToFormValue(pago)));
  }

  /** Reemplaza el FormArray de detalles con las líneas recibidas. */
  private populateLineas(lineas: readonly ComercialDetalleRead[]): void {
    const detalles = this.form.controls.detalles;
    reemplazarFilas(
      detalles,
      lineas.map((line) => createComercialDetalleGroup(comercialDetalleToFormValue(line))),
    );
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.facturaVenta.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Vuelve a la lista del documento activo, derivando la ruta de `routes.list`. */
  private navigateToList(): void {
    this.navigate(this.document().routes.list);
  }

  /** Abre la ficha del documento guardado (`routes.detail` + id). */
  private navigateToDetail(id: string | number): void {
    this.navigate(this.document().routes.detail, String(id));
  }

  /** Construye la ruta absoluta del documento dentro del tenant y el módulo. */
  private navigate(routePath: string, extra?: string): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = routePath.split('/').filter(Boolean);
    const commands: (string | number)[] = [
      '/t',
      slug,
      currentModuleId(this.activeModule),
      ...segments,
    ];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
