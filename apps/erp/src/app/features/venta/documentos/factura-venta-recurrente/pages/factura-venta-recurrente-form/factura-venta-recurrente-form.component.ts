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
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
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
import type { AppDict } from '@erp/i18n';
import {
  METODO_PAGO_ENDPOINT,
  SEDE_ENDPOINT,
  asesorLabel,
} from '../../factura-venta-recurrente.constants';
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
import { comercialDetalleToFormValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import {
  facturaVentaRecurrenteToFormValue,
  formValueToPayload,
} from '../../factura-venta-recurrente.mapper';
import type { FacturaVentaRecurrenteRead } from '../../factura-venta-recurrente.model';

/**
 * Formulario de alta/edición de la **cabecera** de una Factura de venta
 * recurrente (la plantilla desde la que se generan facturas reales).
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista. El HTTP se
 * delega en `ENTITY_DATA_GATEWAY`.
 *
 * Comparte el shape de la factura de venta (es su plantilla): la cabecera
 * comercial es específica del documento —por eso vive dentro de
 * `factura-venta-recurrente/` y no en un _shared—; la **tabla de detalles**
 * —compartida entre documentos comerciales— se compone vía
 * `<app-comercial-documento-detalles>`.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-factura-venta-recurrente-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
    VencimientoHintComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './factura-venta-recurrente-form.component.html',
  styleUrl: './factura-venta-recurrente-form.component.scss',
})
export class FacturaVentaRecurrenteFormComponent implements OnInit, CanComponentDeactivate {
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

  protected readonly t = this.i18n.t;

  /** Tabla de líneas: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly asesorEndpoint = SELECT_ENDPOINTS.asesor;
  protected readonly asesorLabel = asesorLabel;

  /**
   * Sección "Más información" plegada/desplegada. Sus cuatro campos son opcionales
   * y casi nunca se tocan: abiertos empujarían hacia abajo la tabla de líneas, que
   * es a lo que la persona vino. Se abre sola si el documento trae algo cargado.
   */
  protected readonly masInfoOpen = signal(false);

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
    // Los límites salen del schema del backend (`GenDocumentoRequest`).
    orden_compra: this.fb.control<string | null>(null, Validators.maxLength(50)),
    remision: this.fb.control<string | null>(null, Validators.maxLength(50)),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    asesor: this.fb.control<ErpSelectOption | null>(null),
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

    // Al elegir cliente, adopta su plazo de pago pactado. Cambiar el plazo
    // dispara el autocálculo de arriba, que reajusta la fecha de vencimiento. En
    // edición no aplica: `applyCabecera` puebla con `emitEvent: false`.
    setupPlazoPagoDesdeContacto({
      contacto: this.form.controls.contacto,
      plazoPago: this.form.controls.plazo_pago,
      origen: 'cliente',
      destroyRef: this.destroyRef,
    });
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as FacturaVentaRecurrenteRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const detalles = this.detallesTable();
    // En edición las líneas transaccionan aparte (no viajan en el payload de la
    // cabecera). Para que no se pierdan, antes de guardar el documento se
    // flushean las pendientes; si hay líneas incompletas se avisa y se aborta.
    if (id && detalles) {
      if (detalles.hasInvalidPending()) {
        const toast = this.t().entities.comercialDetalle.toasts.incompleteLines;
        this.toast.warn(toast.title, toast.desc);
        return;
      }
      if (detalles.pendingCount() > 0) {
        this.isSaving.set(true);
        // Flush silencioso: el éxito lo confirma el toast del documento; aquí solo
        // se reporta si el guardado de líneas falla (si no, sería un fallo mudo).
        detalles
          .saveAll()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.persistCabecera(id),
            error: () => {
              this.isSaving.set(false);
              const toast = this.t().entities.comercialDetalle.toasts.lineSaveError;
              this.toast.error(toast.title, toast.desc);
            },
          });
        return;
      }
    }

    this.isSaving.set(true);
    this.persistCabecera(id);
  }

  /** Guarda la cabecera (create/update). Asume `isSaving` ya en `true`. */
  private persistCabecera(id: string | undefined): void {
    const toasts = this.t().entities.facturaVentaRecurrente.form.toasts;
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
        this.isSaving.set(false);
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

  /**
   * Guard de salida: si hay líneas sin guardar, confirma antes de abandonar para
   * no perderlas (el guardado del documento las flushea, así que tras guardar no
   * hay pendientes y no molesta). Solo aplica en edición.
   */
  canDeactivate(): boolean | Observable<boolean> {
    const detalles = this.detallesTable();
    if (!detalles || detalles.pendingCount() === 0) return true;

    const labels = this.t().entities.comercialDetalle;
    return new Observable<boolean>((subscriber) => {
      this.confirmation.confirm({
        header: labels.leaveHeader,
        message: labels.leaveMessage,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: labels.leaveConfirm,
        rejectLabel: this.t().common.actions.cancel,
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => {
          subscriber.next(true);
          subscriber.complete();
        },
        reject: () => {
          subscriber.next(false);
          subscriber.complete();
        },
      });
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
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.applyCabecera(cabecera as FacturaVentaRecurrenteRead);
          this.populateLineas(lineas);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga solo las líneas (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
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
   * y respetar el vencimiento que viene del backend.
   */
  private applyCabecera(read: FacturaVentaRecurrenteRead): void {
    const values = facturaVentaRecurrenteToFormValue(read);
    this.form.patchValue(values, { emitEvent: false });
    // Un dato guardado que vive tras un clic es un dato invisible: si el
    // documento trae algo en la sección, se abre de entrada.
    if (values.orden_compra || values.remision || values.comentario || values.asesor) {
      this.masInfoOpen.set(true);
    }
  }

  /** Reemplaza el FormArray de detalles con las líneas recibidas. */
  private populateLineas(lineas: readonly ComercialDetalleRead[]): void {
    const detalles = this.form.controls.detalles;
    detalles.clear();
    for (const line of lineas)
      detalles.push(createComercialDetalleGroup(comercialDetalleToFormValue(line)));
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.facturaVentaRecurrente.form.toasts;
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
