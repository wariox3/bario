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
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent } from '@reddoc/ui';
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
import { ErpContactoSelectComponent, ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { DocumentoPagosComponent } from '@erp/features/documentos/pagos/components/documento-pagos/documento-pagos.component';
import { createPagoGroup, type PagoGroup } from '@erp/features/documentos/pagos/pago.form';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import type { PagoRead } from '@erp/features/documentos/pagos/pago.model';
import { notaVentaToFormValue, formValueToPayload } from '../../nota-documento.mapper';
import type { NotaVentaRead } from '../../nota-documento.model';
import {
  METODO_PAGO_ENDPOINT,
  NOTA_VENTA_REFERENCIA_ENDPOINT,
  SEDE_ENDPOINT,
} from '../../nota-documento.constants';

/**
 * Formulario de alta/edición de la **cabecera** de una nota de venta. Lo comparten
 * la nota crédito (2) y la nota débito (3): la cabecera es idéntica entre ellas y
 * lo único que las distingue —el `documento_tipo`— sale de la config inyectada.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver`) y deriva de él el
 * `documentTypeId`, el nombre visible y la ruta de la lista.
 *
 * Una nota de venta ajusta una factura de venta (`documento_referencia`) y, como
 * el POS, puede cobrarse en el acto: a la cabecera (cliente, fecha, sede, método
 * de pago, comentario) le suma la **sección de pagos** —compartida— y la **tabla
 * de detalles** comercial. Detalles / Pagos / Más información van en tabs.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-nota-documento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    TabsModule,
    TextareaModule,
    FieldErrorComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
    DocumentoPagosComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-documento-form.component.html',
  styleUrl: './nota-documento-form.component.scss',
})
export class NotaDocumentoFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
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
   * el guardado y colorear el chip de la pestaña; el panel del tab sigue montado
   * aunque no esté activo (PrimeNG no lo destruye).
   */
  private readonly pagosPanel = viewChild(DocumentoPagosComponent);

  /** Tab activo del bloque (Detalles / Pagos / Más información). */
  protected readonly activeTab = signal<'detalles' | 'pagos' | 'informacion'>('detalles');

  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly referenciaEndpoint = NOTA_VENTA_REFERENCIA_ENDPOINT;

  /** Filtra el autocomplete de contacto a clientes. */
  protected readonly contactoParams = { cliente: 'True' } as const;

  /** Cliente seleccionado: acota (y habilita) el select de documento referencia. */
  private readonly contactoId = signal<number | null>(null);

  /**
   * Parámetros del select de documento referencia. Se reevalúa al cambiar el
   * cliente: lista sus facturas de venta aprobadas (serializador `referencia`).
   * Vacío mientras no haya cliente (el control queda deshabilitado y no consulta).
   *
   * TODO(nota-venta): pendiente confirmar con backend el contrato del endpoint de
   * referencia antes de reactivar el select (está comentado en el template).
   * Supuestos actuales (calcados del legacy):
   *  - GET `/general/documento/` con `serializador=referencia`.
   *  - Se filtra a facturas de venta aprobadas del cliente
   *    (`documento_tipo__venta=True`, `documento_tipo__operacion=1`, `estado_aprobado=true`).
   *  - El serializer devuelve `{ id, numero, fecha }` (se pinta `numero - fecha`).
   */
  protected readonly referenciaParams = computed<Record<string, string>>(() => {
    const id = this.contactoId();
    if (id == null) return {};
    const params: Record<string, string> = {
      contacto_id: String(id),
      documento_tipo__venta: 'true',
      documento_tipo__operacion: '1',
      estado_aprobado: 'true',
      serializador: 'referencia',
    };
    return params;
  });

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
   * Nombre del documento activo (Nota crédito, Nota débito…). La página la
   * comparte la familia: el título sale de la config, no de un literal i18n.
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
    documento_referencia: this.fb.control<ErpSelectOption | null>({ value: null, disabled: true }),
    sede: this.fb.control<ErpSelectOption | null>(null),
    metodo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    pagos: new FormArray<PagoGroup>([]),
  });

  constructor() {
    // El documento referencia depende del cliente: al cambiarlo se acota su lista
    // (vía `referenciaParams`), se habilita el control y se limpia la referencia
    // previa (pertenecía a otro cliente).
    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.onContactoChange(contacto?.id ?? null));

    // Espejo reactivo de las líneas para el total del documento.
    this.form.controls.detalles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.lines.set(this.form.controls.detalles.getRawValue()));
  }

  /** Getter tipado del `FormArray` de pagos (para el chip de la pestaña y la carga). */
  protected get pagos(): FormArray<PagoGroup> {
    return this.form.controls.pagos;
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as NotaVentaRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    // Validación propia: lo recibido en pagos no puede superar el total. Con los
    // pagos tras un tab, se abre la pestaña que lo contiene antes de avisar.
    if (this.pagosExceden()) {
      this.activeTab.set('pagos');
      const toast = this.t().entities.documentoPago.toasts.exceden;
      this.toast.warn(toast.title, toast.desc);
      return;
    }

    const id = this.id();
    const detalles = this.detallesTable();
    // En edición las líneas transaccionan aparte (no viajan en el payload de la
    // cabecera). Antes de guardar el documento se flushean las pendientes; si hay
    // líneas incompletas se avisa y se aborta.
    if (id && detalles) {
      if (detalles.hasInvalidPending()) {
        this.activeTab.set('detalles');
        const toast = this.t().entities.comercialDetalle.toasts.incompleteLines;
        this.toast.warn(toast.title, toast.desc);
        return;
      }
      if (detalles.pendingCount() > 0) {
        this.isSaving.set(true);
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
    const toasts = this.t().entities.notaVenta.form.toasts;
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
   * no perderlas. Solo aplica en edición.
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
   * Carga completa (cabecera + líneas). La cabecera ya no embebe los detalles: las
   * líneas se traen aparte de `documento-detalle/?documento_id=`. Se usa como
   * fallback de la carga inicial y para recargar tras importar.
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.applyCabecera(cabecera as NotaVentaRead);
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
   * Pobla la cabecera en el form. `emitEvent: false`: no disparar el efecto de
   * cambio de cliente (que limpiaría la referencia recién cargada). Como el patch
   * no emite, sincronizamos el estado del select de referencia a mano. Los pagos
   * se reconstruyen aparte (van en un `FormArray`).
   */
  private applyCabecera(read: NotaVentaRead): void {
    this.form.patchValue(notaVentaToFormValue(read), { emitEvent: false });
    this.syncReferenciaState();
    this.populatePagos(read.pagos ?? []);
  }

  /**
   * Sincroniza el estado del select de documento referencia con el cliente
   * cargado (sin limpiar la referencia). Se usa al poblar en edición, donde el
   * patch no emitió eventos.
   */
  private syncReferenciaState(): void {
    const id = this.form.controls.contacto.value?.id ?? null;
    this.contactoId.set(id);
    const ref = this.form.controls.documento_referencia;
    if (id == null) ref.disable({ emitEvent: false });
    else ref.enable({ emitEvent: false });
  }

  /** Reacciona a un cambio de cliente hecho por el usuario. */
  private onContactoChange(id: number | null): void {
    this.contactoId.set(id);
    const ref = this.form.controls.documento_referencia;
    // La referencia previa pertenecía a otro cliente: se descarta.
    ref.setValue(null, { emitEvent: false });
    if (id == null) ref.disable({ emitEvent: false });
    else ref.enable({ emitEvent: false });
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
    const toasts = this.t().entities.notaVenta.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Etiqueta de una opción del select de referencia: `número - fecha`. */
  protected readonly referenciaLabel = (option: ErpSelectOption): string => {
    const numero = option['numero'];
    const fecha = option['fecha'];
    if (numero != null && numero !== '') {
      return fecha ? `${numero} - ${fecha}` : String(numero);
    }
    return option.nombre || '';
  };

  /** Vuelve a la lista del documento activo, derivando la ruta de `routes.list`. */
  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...segments]);
  }
}
