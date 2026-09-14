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
import { Observable, forkJoin } from 'rxjs';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  calcularResumen,
  startOfToday,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpSelectDataService, SELECT_ENDPOINTS } from '@reddoc/core';
import {
  DocumentoDetalleService,
  ENTITY_DATA_GATEWAY,
  extractDocumentoId,
} from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import { canLeaveDocumentForm } from '@erp/core/guards/leave-document-form';
import type { AppDict } from '@erp/i18n';
import { METODO_PAGO_ENDPOINT, SEDE_ENDPOINT } from '../../factura-venta.constants';
import { precioListaDeContacto } from '@erp/features/documentos/comercial/precio-lista-contacto';
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
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
  totalCantidad,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { DocumentoPagosComponent } from '@erp/features/documentos/pagos/components/documento-pagos/documento-pagos.component';
import {
  guardarTablasEnSerie,
  pestanaConPrimerError,
  registrarPagosDeAlta,
  type TablaEnVivoDocumento,
} from '@erp/features/documentos/tablas-en-vivo';
import { createPagoGroup, type PagoGroup } from '@erp/features/documentos/pagos/pago.form';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import type { PagoRead } from '@erp/features/documentos/pagos/pago.model';
import { DocumentoPagoService } from '@erp/features/documentos/pagos/pago.service';
import { calcularPagos } from '@erp/features/documentos/pagos/pago.calculo';
import type { PagoFormRawValue } from '@erp/features/documentos/pagos/pago.form';
import { facturaVentaToFormValue, formValueToPayload } from '../../factura-venta.mapper';
import type { FacturaVentaRead } from '../../factura-venta.model';

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
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    TabsModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
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

  /** Tabla de pagos: en edición persiste en vivo; en alta registra los pagos al crear. */
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

  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;

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

  /** Id del documento como número (`null` en alta); alimenta la transacción por línea. */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });
  protected readonly isSaving = signal(false);

  /** Espejo reactivo de las líneas para calcular el total del documento. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);

  /** Resumen del documento: lo pinta el aside bajo los tabs, igual en Detalles y Pagos. */
  protected readonly resumen = computed(() => calcularResumen(this.lines().map(toLineaCalculo)));

  /** Total del documento: contra él se validan y se prellenan los pagos. */
  protected readonly totalGeneral = computed(() => this.resumen().total);

  /** Suma de cantidades de las líneas (fila «Total cantidad» del resumen). */
  protected readonly cantidadTotal = computed(() => totalCantidad(this.lines()));

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
    metodo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    pagos: new FormArray<PagoGroup>([]),
  });

  /**
   * Estado del vencimiento (días del plazo, fecha que dicta y desvío), para que
   * `<app-vencimiento-hint>` explique bajo el campo de dónde salió la fecha.
   */
  protected readonly vencimiento: VencimientoAutocompute;

  constructor() {
    // Autocálculo del vencimiento (fecha + días del plazo); el campo sigue editable.
    this.vencimiento = setupVencimientoAutocompute({
      fecha: this.form.controls.fecha,
      plazoPago: this.form.controls.plazo_pago,
      fechaVence: this.form.controls.fecha_vence,
      selectData: this.selectData,
      destroyRef: this.destroyRef,
      endpoint: this.plazoPagoEndpoint,
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

  /** Tablas que transaccionan en vivo, en el orden en que se guardan. */
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
    // En edición se omiten los detalles del payload: ya transaccionaron en vivo.
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

  /**
   * Guard de salida: si hay líneas sin guardar, confirma antes de abandonar para
   * no perderlas (el guardado del documento las flushea, así que tras guardar no
   * hay pendientes y no molesta). Solo aplica en edición.
   */
  canDeactivate(): boolean | Observable<boolean> {
    return canLeaveDocumentForm({
      form: this.form,
      pendingLines:
        (this.detallesTable()?.pendingCount() ?? 0) + (this.pagosTable()?.pendingCount() ?? 0),
      // En edición los pagos transaccionan aparte, como las líneas: los cuenta `pendingLines`.
      lineControls: ['detalles', 'pagos'],
      // En alta nada persiste aparte: tocar una línea o un pago y salir también pierde trabajo.
      enAlta: !this.id(),
      confirmation: this.confirmation,
      labels: this.t().entities.comercialDetalle,
      cancelLabel: this.t().common.actions.cancel,
    });
  }

  /**
   * Tras importar líneas en **edición** (ya persistidas vía `masivo/`), recarga el
   * documento para reflejar las nuevas líneas con sus ids y montos autoritativos.
   */
  protected onImported(): void {
    const id = this.documentId();
    if (id != null) this.loadDocumento(id);
  }

  /**
   * Carga completa (cabecera + líneas). La cabecera (`documento/:id/`) ya no
   * embebe los detalles: las líneas se traen aparte de
   * `documento-detalle/?documento_id=`. Se usa como fallback de la carga inicial
   * (si el resolver no pre-cargó la cabecera) y para recargar tras importar.
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      pagos: this.pagoService.listarPorDocumento(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas, pagos }) => {
          this.applyCabecera(cabecera as FacturaVentaRead);
          this.populateLineas(lineas);
          this.populatePagos(pagos);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga líneas y pagos (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
    forkJoin({
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      pagos: this.pagoService.listarPorDocumento(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lineas, pagos }) => {
          this.populateLineas(lineas);
          this.populatePagos(pagos);
        },
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
    detalles.clear();
    for (const line of lineas)
      detalles.push(createComercialDetalleGroup(comercialDetalleToFormValue(line)));
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
