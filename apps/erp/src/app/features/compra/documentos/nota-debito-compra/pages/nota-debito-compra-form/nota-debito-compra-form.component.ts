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
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import {
  DOCUMENT_TYPE_ID,
  FormErrorService,
  I18nService,
  startOfToday,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { compraDocumentoBreadcrumb } from '@erp/features/compra/shared/compra-breadcrumb';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { SELECT_ENDPOINTS } from '@reddoc/core';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import { comercialDetalleToFormValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import { notaDebitoCompraToFormValue, formValueToPayload } from '../../nota-debito-compra.mapper';
import type { NotaDebitoCompraRead } from '../../nota-debito-compra.model';
import { NOTA_DEBITO_COMPRA_REFERENCIA_ENDPOINT } from '../../nota-debito-compra.constants';

/**
 * Formulario de alta/edición de la **cabecera** de una Nota débito de compra.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista.
 *
 * Es de la familia comercial (misma tabla de líneas que la factura de compra,
 * en `modo="compra"`), y suma a la cabecera el **documento de referencia** (la
 * factura de compra que la nota ajusta), el centro de costo y el comentario.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-nota-debito-compra-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-debito-compra-form.component.html',
  styleUrl: './nota-debito-compra-form.component.scss',
})
export class NotaDebitoCompraFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
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

  // Endpoints de catálogos compartidos (fuente única en select-endpoints.ts).
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;
  protected readonly referenciaEndpoint = NOTA_DEBITO_COMPRA_REFERENCIA_ENDPOINT;

  /** Filtra el autocomplete de contacto a proveedores. */
  protected readonly contactoParams = { proveedor: 'True' } as const;

  /** Proveedor seleccionado: acota (y habilita) el select de documento referencia. */
  private readonly contactoId = signal<number | null>(null);

  /**
   * Parámetros del select de documento referencia. Se reevalúa al cambiar el
   * proveedor: lista sus facturas de compra aprobadas (serializador `referencia`).
   * Vacío mientras no haya proveedor (el control queda deshabilitado y no consulta).
   *
   * TODO(nota-debito-compra): pendiente confirmar con backend el contrato del
   * endpoint de referencia antes de reactivar el select (está comentado en el
   * template). Supuestos actuales (ver memoria project-nota-credito-compra.md):
   *  - GET `/general/documento/` con `serializador=referencia`.
   *  - Se filtra por `documento_tipo_id=5` (factura de compra). El legacy usaba
   *    `documento_tipo__documento_clase_id=301` (clase, no tipo) → decidir cuál.
   *  - El serializer devuelve `{ id, numero, fecha }` (se pinta `numero - fecha`).
   */
  protected readonly referenciaParams = computed<Record<string, string>>(() => {
    const id = this.contactoId();
    if (id == null) return {};
    const params: Record<string, string> = {
      contacto_id: String(id),
      documento_tipo_id: String(DOCUMENT_TYPE_ID.COMPRA),
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
    documento_referencia: this.fb.control<ErpSelectOption | null>({ value: null, disabled: true }),
    centro_costo: this.fb.control<ErpSelectOption | null>(null),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
  });

  constructor() {
    // El documento referencia depende del proveedor: al cambiarlo se acota su
    // lista (vía `referenciaParams`), se habilita el control y se limpia la
    // referencia previa (pertenecía a otro proveedor).
    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.onContactoChange(contacto?.id ?? null));
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as NotaDebitoCompraRead);
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
    const toasts = this.t().entities.notaDebitoCompra.form.toasts;
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
   * Carga completa (cabecera + líneas). Se usa como fallback de la carga inicial
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
          this.applyCabecera(cabecera as NotaDebitoCompraRead);
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
   * cambio de proveedor (que limpiaría la referencia recién cargada). Como el
   * patch no emite, sincronizamos el estado del select de referencia a mano.
   */
  private applyCabecera(read: NotaDebitoCompraRead): void {
    this.form.patchValue(notaDebitoCompraToFormValue(read), { emitEvent: false });
    this.syncReferenciaState();
  }

  /**
   * Sincroniza el estado del select de documento referencia con el proveedor
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

  /** Reacciona a un cambio de proveedor hecho por el usuario. */
  private onContactoChange(id: number | null): void {
    this.contactoId.set(id);
    const ref = this.form.controls.documento_referencia;
    // La referencia previa pertenecía a otro proveedor: se descarta.
    ref.setValue(null, { emitEvent: false });
    if (id == null) ref.disable({ emitEvent: false });
    else ref.enable({ emitEvent: false });
  }

  /** Reemplaza el FormArray de detalles con las líneas recibidas. */
  private populateLineas(lineas: readonly ComercialDetalleRead[]): void {
    const detalles = this.form.controls.detalles;
    detalles.clear();
    for (const line of lineas)
      detalles.push(createComercialDetalleGroup(comercialDetalleToFormValue(line)));
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.notaDebitoCompra.form.toasts;
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
    void this.router.navigate(['/t', slug, 'compra', ...segments]);
  }
}
