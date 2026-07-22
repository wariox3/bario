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
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  calcularResumen,
  formatCop,
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
import {
  CUENTA_BANCO_ENDPOINT,
  METODO_PAGO_ENDPOINT,
  SEDE_ENDPOINT,
} from '../../factura-pos.constants';
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
import { facturaPosToFormValue, formValueToPayload } from '../../factura-pos.mapper';
import type { FacturaPosRead, PagoRead } from '../../factura-pos.model';
import type { PagoFormRawValue } from '../../factura-pos-form.types';

/** Grupo reactivo de una fila de pago (cuenta de banco + monto). */
export type PagoGroup = FormGroup<{
  cuenta_banco: FormControl<ErpSelectOption | null>;
  pago: FormControl<number>;
}>;

/**
 * Formulario de alta/edición de la **cabecera** de una Factura POS (punto de venta).
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento` (discriminado por `documento_tipo`). El form recibe el
 * `DocumentEntityConfig` por input binding (resuelto por `activeDocumentResolver`)
 * y deriva de él el `documentTypeId`, las claves i18n y la ruta de la lista.
 *
 * La factura POS es una factura de venta que además **se cobra en el acto**: a la
 * cabecera comercial (contacto, fechas, plazo, método de pago, sede, asesor,
 * orden de compra, comentario) le suma una **sección de pagos** —un `FormArray`
 * de `{ cuenta_banco, monto }`— que no tiene la factura de venta normal. La
 * **tabla de detalles** —compartida entre documentos comerciales— se compone vía
 * `<app-comercial-documento-detalles>`.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-factura-pos-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    FieldErrorComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    ComercialDocumentoDetallesComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './factura-pos-form.component.html',
  styleUrl: './factura-pos-form.component.scss',
})
export class FacturaPosFormComponent implements OnInit, CanComponentDeactivate {
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
  protected readonly formatMoney = formatCop;

  /** Tabla de líneas: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

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
  /** Espejo reactivo de los pagos para el total recibido y el faltante. */
  protected readonly pagosMirror = signal<readonly PagoFormRawValue[]>([]);

  /** Total del documento (mismo kernel que la tabla de detalles y el resumen). */
  protected readonly totalGeneral = computed(
    () => calcularResumen(this.lines().map(toLineaCalculo)).total,
  );
  /** Total recibido en pagos. */
  protected readonly totalPagos = computed(() =>
    this.pagosMirror().reduce((acc, p) => acc + (p.pago ?? 0), 0),
  );
  /** Saldo pendiente por cubrir con pagos (nunca negativo para mostrar). */
  protected readonly saldoPendiente = computed(() =>
    Math.max(this.totalGeneral() - this.totalPagos(), 0),
  );
  /** `true` cuando lo recibido supera el total del documento (bloquea el guardado). */
  protected readonly pagosExceden = computed(() => this.totalPagos() > this.totalGeneral());

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

    // Al elegir cliente, adopta su plazo de pago por defecto. Cambiar el plazo
    // dispara el autocálculo de arriba, que reajusta la fecha de vencimiento. En
    // edición no aplica: `applyCabecera` puebla con `emitEvent: false`.
    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.aplicarPlazoDesdeCliente(contacto));

    // Espejos reactivos para el total del documento y el total recibido.
    this.form.controls.detalles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.lines.set(this.form.controls.detalles.getRawValue()));
    this.form.controls.pagos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pagosMirror.set(this.form.controls.pagos.getRawValue()));
  }

  /**
   * Setea `plazo_pago` con el plazo por defecto del cliente (`plazo_pago_id` del
   * endpoint `contacto/seleccionar/`). Solo el `id` importa: el `<lib-api-select>`
   * resuelve la etiqueta contra sus opciones cargadas y el autocálculo del
   * vencimiento deriva los días. No hace nada si el cliente no trae plazo o si ya
   * es el seleccionado (evita recomputar en vano).
   */
  private aplicarPlazoDesdeCliente(contacto: ErpSelectOption | null): void {
    const plazoId = contacto?.['plazo_pago_id'];
    if (typeof plazoId !== 'number') return;
    if (this.form.controls.plazo_pago.value?.id === plazoId) return;
    this.form.controls.plazo_pago.setValue({ id: plazoId, nombre: '' });
  }

  // ── Pagos ───────────────────────────────────────────────────────────────────

  /** Getter tipado del `FormArray` de pagos (comodidad para el template). */
  protected get pagos(): FormArray<PagoGroup> {
    return this.form.controls.pagos;
  }

  /** Crea una fila de pago (cuenta de banco requerida, monto ≥ 0). */
  private createPagoGroup(value?: PagoFormRawValue): PagoGroup {
    return this.fb.group({
      cuenta_banco: this.fb.control<ErpSelectOption | null>(
        value?.cuenta_banco ?? null,
        Validators.required,
      ),
      pago: this.fb.nonNullable.control<number>(value?.pago ?? 0, Validators.min(0)),
    }) as PagoGroup;
  }

  /** Agrega una fila de pago vacía. */
  protected addPago(): void {
    this.pagos.push(this.createPagoGroup());
  }

  /** Quita la fila de pago en `index`. */
  protected removePago(index: number): void {
    this.pagos.removeAt(index);
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as FacturaPosRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    // Validación propia del POS: lo recibido no puede superar el total.
    if (this.pagosExceden()) {
      const toast = this.t().entities.facturaPos.form.pagos.toasts.exceden;
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
    const toasts = this.t().entities.facturaPos.form.toasts;
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
          this.applyCabecera(cabecera as FacturaPosRead);
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
  private applyCabecera(read: FacturaPosRead): void {
    const value = facturaPosToFormValue(read);
    this.form.patchValue(value, { emitEvent: false });
    this.populatePagos(read.pagos ?? []);
  }

  /** Reemplaza el `FormArray` de pagos con los recibidos del backend. */
  private populatePagos(pagos: readonly PagoRead[]): void {
    const arr = this.form.controls.pagos;
    arr.clear();
    for (const pago of pagos)
      arr.push(
        this.createPagoGroup({
          cuenta_banco:
            pago.cuenta_banco != null
              ? { id: pago.cuenta_banco, nombre: pago.cuenta_banco_nombre ?? '' }
              : null,
          pago: Number(pago.pago ?? 0),
        }),
      );
    this.pagosMirror.set(arr.getRawValue());
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
    const toasts = this.t().entities.facturaPos.form.toasts;
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
