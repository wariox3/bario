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
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
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
import {
  ErpContactoSelectComponent,
  ErpApiSelectComponent,
  ErpAsesorSelectComponent,
} from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpSelectDataService, SELECT_ENDPOINTS } from '@reddoc/core';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import type { AppDict } from '@erp/i18n';
import { METODO_PAGO_ENDPOINT, SEDE_ENDPOINT } from '../../pos-documento.constants';
import { DocumentoPagosComponent } from '@erp/features/documentos/pagos/components/documento-pagos/documento-pagos.component';
import { createPagoGroup, type PagoGroup } from '@erp/features/documentos/pagos/pago.form';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import { precioListaDeContacto } from '@erp/features/documentos/comercial/precio-lista-contacto';
import { setupPlazoPagoDesdeContacto } from '@erp/features/documentos/comercial/plazo-pago-contacto';
import { setupVencimientoAutocompute } from '@erp/features/documentos/comercial/vencimiento-autocompute';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import { comercialDetalleToFormValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import { toLineaCalculo } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { posDocumentoToFormValue, formValueToPayload } from '../../pos-documento.mapper';
import type { PosDocumentoRead } from '../../pos-documento.model';
import type { PagoRead } from '@erp/features/documentos/pagos/pago.model';

/**
 * Formulario de alta/edición de la **cabecera** de un documento POS (punto de
 * venta). Lo comparten todos los documentos de la familia (factura POS, factura
 * POS electrónica…): la cabecera es idéntica entre ellos y lo único que los
 * distingue —el `documento_tipo`— sale de la config inyectada.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` (discriminado por `documento_tipo`). El form recibe el
 * `DocumentEntityConfig` por input binding (resuelto por `activeDocumentResolver`)
 * y deriva de él el `documentTypeId`, el nombre visible y la ruta de la lista.
 *
 * Un POS es una factura de venta que además **se cobra en el acto**: a la
 * cabecera comercial (contacto, fechas, plazo, método de pago, sede, asesor,
 * orden de compra, comentario) le suma una **sección de pagos** —un `FormArray`
 * de `{ cuenta_banco, monto }`— que no tiene la factura de venta normal. La
 * **tabla de detalles** —compartida entre documentos comerciales— se compone vía
 * `<app-comercial-documento-detalles>`.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-pos-documento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputTextModule,
    TabsModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    ComercialDocumentoDetallesComponent,
    DocumentoPagosComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './pos-documento-form.component.html',
  styleUrl: './pos-documento-form.component.scss',
})
export class PosDocumentoFormComponent implements OnInit, CanComponentDeactivate {
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

  /**
   * Sección de pagos (dentro de su tab). El padre le lee `excede()` para bloquear
   * el guardado y colorear el chip de la pestaña. El panel del tab está montado
   * aunque no esté activo (PrimeNG no lo destruye), así que `excede()` es legible
   * desde cualquier pestaña —mismo patrón que las tablas de la factura de compra.
   */
  private readonly pagosPanel = viewChild(DocumentoPagosComponent);

  /**
   * Tab activo del bloque de líneas (Detalles / Pagos / Más información). Mismo
   * patrón que la factura de compra: los bloques del documento comparten una card
   * en vez de apilarse. "Más información" agrupa los campos secundarios (comentario).
   */
  protected readonly activeTab = signal<'detalles' | 'pagos' | 'informacion'>('detalles');

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

  /** Total del documento (mismo kernel que la tabla de detalles y el resumen). */
  protected readonly totalGeneral = computed(
    () => calcularResumen(this.lines().map(toLineaCalculo)).total,
  );

  /** `true` cuando lo recibido supera el total; lo aporta la sección de pagos. */
  protected readonly pagosExceden = computed(() => this.pagosPanel()?.excede() ?? false);

  /**
   * Nombre del documento activo (Factura POS, Factura POS electrónica…). La
   * página la comparte toda la familia POS: el título sale de la config, no de
   * un literal i18n propio de un documento.
   */
  protected readonly documentName = computed(() =>
    this.i18n.translate(this.document().displayNameKey),
  );

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
    asesor: this.fb.control<ErpSelectOption | null>(null),
    orden_compra: this.fb.control<string | null>(null, Validators.maxLength(50)),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    pagos: new FormArray<PagoGroup>([]),
  });

  constructor() {
    // Autocálculo del vencimiento (fecha + días del plazo); el campo sigue editable.
    setupVencimientoAutocompute({
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

    // Espejo reactivo de las líneas para el total del documento (el total recibido
    // en pagos lo calcula la sección de pagos a partir de su `FormArray`).
    this.form.controls.detalles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.lines.set(this.form.controls.detalles.getRawValue()));
  }

  /** Getter tipado del `FormArray` de pagos (para el chip de la pestaña y la carga). */
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
      this.applyCabecera(prefetched as PosDocumentoRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    // Validación propia del POS: lo recibido no puede superar el total. Con los
    // pagos tras un tab, avisar sin más dejaría al usuario buscando el error:
    // se abre la pestaña que lo contiene antes de reportarlo.
    if (this.pagosExceden()) {
      this.activeTab.set('pagos');
      const toast = this.t().entities.documentoPago.toasts.exceden;
      this.toast.warn(toast.title, toast.desc);
      return;
    }

    const id = this.id();
    const detalles = this.detallesTable();
    // En edición las líneas transaccionan aparte (no viajan en el payload de la
    // cabecera). Para que no se pierdan, antes de guardar el documento se
    // flushean las pendientes; si hay líneas incompletas se avisa y se aborta.
    if (id && detalles) {
      if (detalles.hasInvalidPending()) {
        // Igual que con los pagos: abrir la pestaña del error antes de avisarlo.
        this.activeTab.set('detalles');
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
    const toasts = this.t().entities.posDocumento.form.toasts;
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
      next: () => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        this.navigateToList();
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
          this.applyCabecera(cabecera as PosDocumentoRead);
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
   * y respetar el vencimiento que viene del backend. Los pagos se reconstruyen
   * aparte (van en un `FormArray`, no en `patchValue`).
   */
  private applyCabecera(read: PosDocumentoRead): void {
    const value = posDocumentoToFormValue(read);
    this.form.patchValue(value, { emitEvent: false });
    this.populatePagos(read.pagos ?? []);
  }

  /** Reemplaza el `FormArray` de pagos con los recibidos del backend. */
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
    this.lines.set(detalles.getRawValue());
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.posDocumento.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Vuelve a la lista del documento activo, derivando la ruta de `routes.list`. */
  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...segments]);
  }
}
