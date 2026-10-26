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
import { Observable } from 'rxjs';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
  MascaraFechaDirective,
} from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  startOfToday,
  TenantService,
  ToastService,
  resumenDesdeCabecera,
  type ResumenDocumento,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { compraDocumentoBreadcrumb } from '@erp/features/compra/shared/compra-breadcrumb';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import {
  ErpSelectDataService,
  RESOLUCION_ACTIVA_PARAMS,
  SELECT_ENDPOINTS,
  resolucionLabel,
} from '@reddoc/core';
import { ENTITY_DATA_GATEWAY, extractDocumentoId } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import {
  canLeaveDocumentForm,
  hayCambiosSinGuardar,
  type CambiosDocumento,
} from '@erp/core/guards/leave-document-form';
import {
  guardarTablasEnSerie,
  type TablaEnVivoDocumento,
} from '@erp/features/documentos/tablas-en-vivo';
import { CambiosSinGuardarComponent } from '@erp/features/documentos/components/cambios-sin-guardar/cambios-sin-guardar.component';
import type { AppDict } from '@erp/i18n';
import {
  FORMA_PAGO_ENDPOINT,
  METODO_PAGO_ENDPOINT,
  METODO_PAGO_NO_DEFINIDO,
  RESOLUCION_ENDPOINT,
  SEDE_ENDPOINT,
} from '../../documento-soporte.constants';
import { setupPlazoPagoDesdeContacto } from '@erp/features/documentos/comercial/plazo-pago-contacto';
import {
  setupVencimientoAutocompute,
  type VencimientoAutocompute,
} from '@erp/features/documentos/comercial/vencimiento-autocompute';
import { VencimientoHintComponent } from '@erp/features/documentos/comercial/components/vencimiento-hint/vencimiento-hint.component';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import type { ComercialDetalleGroup } from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import { documentoSoporteToFormValue, formValueToPayload } from '../../documento-soporte.mapper';
import type { DocumentoSoporteRead } from '../../documento-soporte.model';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { MasInformacionComponent } from '@erp/features/documentos/components/mas-informacion/mas-informacion.component';
import { CrearTerceroDirective } from '@erp/features/general/masters/contacto/crear-tercero.directive';

/**
 * Formulario de alta/edición de la **cabecera** de un Documento soporte.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista.
 *
 * Es de la familia comercial (misma tabla de líneas que la factura de compra,
 * en `modo="compra"`), y suma a la cabecera los campos propios del soporte:
 * forma de pago, resolución (de compra), orden de compra y comentario.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */

@Component({
  selector: 'app-documento-soporte-form',
  standalone: true,
  imports: [
    CambiosSinGuardarComponent,
    MasInformacionComponent,
    ComercialDocumentoResumenComponent,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    MascaraFechaDirective,
    InputTextModule,
    TextareaModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpContactoSelectComponent,
    CrearTerceroDirective,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
    VencimientoHintComponent,
    TabsModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './documento-soporte-form.component.html',
  styleUrl: './documento-soporte-form.component.scss',
})
export class DocumentoSoporteFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly t = this.i18n.t;

  /** Tabla de líneas: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  /**
   * La tabla de líneas está guardando o resolviendo ítems (AIU). "Guardar" espera:
   * un segundo lote reenviaría líneas que todavía no tienen `id`.
   */
  protected readonly tablasOcupadas = computed(() => this.detallesTable()?.ocupado() ?? false);

  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly formaPagoEndpoint = FORMA_PAGO_ENDPOINT;
  protected readonly resolucionEndpoint = RESOLUCION_ENDPOINT;

  /** Filtra el autocomplete de contacto a proveedores. */
  protected readonly contactoParams = { proveedor: 'True' } as const;
  /** Filtra el select de resolución a las de compra activas. */
  protected readonly resolucionParams = { ...RESOLUCION_ACTIVA_PARAMS, compra: 'True' } as const;
  /** El `seleccionar` de resoluciones no trae `nombre`: la etiqueta sale de prefijo y número. */
  protected readonly resolucionLabel = resolucionLabel;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  /**
   * Cabecera pre-cargada por `editableDocumentResolver` (clave de ruta
   * `documentoEdit`). En edición llega ya resuelta y el form la reúsa; `null`/
   * ausente en alta o si el resolver hizo fail-open.
   */
  readonly documentoEdit = input<unknown>();

  protected readonly isEditMode = computed(() => !!this.id());

  /**
   * En alta, el select de almacén auto-selecciona la primera bodega (como el
   * legacy): lo habitual es tener una sola. En edición manda la del documento.
   */
  protected readonly almacenSuggestedIndex = computed(() => (this.isEditMode() ? null : 0));

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

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    compraDocumentoBreadcrumb(
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
    forma_pago: this.fb.control<ErpSelectOption | null>(null),
    resolucion: this.fb.control<ErpSelectOption | null>(null),
    orden_compra: this.fb.control<string | null>(null, Validators.maxLength(50)),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
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

    // Al elegir proveedor, adopta su plazo de pago pactado. Cambiar el plazo
    // dispara el autocálculo de arriba, que reajusta la fecha de vencimiento. En
    // edición no aplica: `applyCabecera` puebla con `emitEvent: false`.
    setupPlazoPagoDesdeContacto({
      contacto: this.form.controls.contacto,
      plazoPago: this.form.controls.plazo_pago,
      origen: 'proveedor',
      destroyRef: this.destroyRef,
    });
  }

  /**
   * Resumen que calculó el backend con todas las líneas guardadas, leído de la
   * cabecera en edición. La tabla, paginada, parte de él; `null` en alta.
   */
  protected readonly resumenBase = signal<ResumenDocumento | null>(null);

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red; las
    // líneas las trae la tabla. Sin resolved (fail-open) se pide la cabecera.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as DocumentoSoporteRead);
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving() || this.tablasOcupadas()) return;

    const id = this.id();
    this.isSaving.set(true);
    if (!id) {
      // Alta: las líneas viajan embebidas en el documento.
      this.persistCabecera(id);
      return;
    }

    // Edición: el backend no acepta las líneas en el documento, van por
    // `documento-detalle`. Se guardan sus cambios pendientes (bajas, altas y ediciones)
    // antes de la cabecera; si fallan, se avisa con el motivo del backend y no se sigue.
    guardarTablasEnSerie(this.tablasEnVivo(), this.toast)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => this.persistCabecera(id),
        error: () => this.isSaving.set(false),
      });
  }

  /** Tablas que se guardan aparte del documento, en el orden en que se guardan. */
  private tablasEnVivo(): readonly TablaEnVivoDocumento[] {
    return [
      {
        tabla: this.detallesTable(),
        errorAlGuardar: this.t().entities.comercialDetalle.toasts.lineSaveError,
      },
    ];
  }

  /** Guarda la cabecera (create/update). Asume `isSaving` ya en `true`. */
  private persistCabecera(id: string | undefined): void {
    const toasts = this.t().entities.documentoSoporte.form.toasts;
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
        this.isSaving.set(false);
        // Guardar limpia el estado "sucio": navegar a la ficha pasa por el guard
        // de salida y, sin esto, el camino feliz preguntaría por cambios ya guardados.
        this.form.markAsPristine();
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Guardar termina en la ficha del documento, para revisar lo que quedó
        // almacenado. En alta el id sale de la respuesta del backend; si no
        // viniera, se cae a la lista antes que navegar a una URL inválida.
        const savedId = id ?? extractDocumentoId(saved);
        if (savedId != null) this.navigateToDetail(savedId);
        else this.navigateToList();
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
      // En alta nada persiste aparte: tocar una línea y salir también pierde trabajo.
      enAlta: !this.id(),
      pendingLines: this.detallesTable()?.pendingCount() ?? 0,
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
   * Carga la cabecera (fallback si el resolver no la pre-cargó). Las líneas las
   * trae la tabla, de a una página (`paginada`).
   */
  private loadDocumento(id: number): void {
    this.gateway
      .getById(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cabecera) => this.applyCabecera(cabecera as DocumentoSoporteRead),
        error: () => this.notifyLoadError(),
      });
  }

  /**
   * Pobla la cabecera en el form. `emitEvent: false`: no disparar el autocálculo
   * y respetar el vencimiento que viene del backend.
   */
  private applyCabecera(read: DocumentoSoporteRead): void {
    this.form.patchValue(documentoSoporteToFormValue(read), { emitEvent: false });
    this.resumenBase.set(resumenDesdeCabecera(read));
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.documentoSoporte.form.toasts;
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
    const commands: (string | number)[] = ['/t', slug, 'compra', ...segments];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
