import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, from, switchMap } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogService } from 'primeng/dynamicdialog';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpApiSelectComponent, ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import type { AppDict } from '@erp/i18n';
import { ContableDocumentoLineasTableComponent } from '@erp/features/documentos/contable/components/contable-documento-lineas-table/contable-documento-lineas-table.component';
import { cuentaDetalleToFormValue } from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '@erp/features/documentos/contable/contable-documento-detalle.model';
import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';
import type { CargarCierreSeleccion } from '../../components/cargar-cierre-modal/cargar-cierre-modal.component';
import { CIERRE_DETALLE_PAGE_SIZE } from '../../cierre.constants';
import { cierreToFormValue, formValueToPayload } from '../../cierre.mapper';
import type { CierreRead } from '../../cierre.model';
import { CierreService } from '../../cierre.service';
import { fecha31Diciembre } from '../../cierre.validators';

/**
 * Saca el id del documento de la respuesta de creación.
 *
 * ⚠️ Mismo supuesto que en la depreciación: el gateway devuelve el body crudo del
 * `POST` y no está verificado si el backend responde el documento plano o
 * envuelto en `{ documento: … }` (así lo hacía el ERP anterior).
 */
function extractDocumentoId(saved: unknown): number | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const plano = (saved as { id?: unknown }).id;
  if (typeof plano === 'number') return plano;
  const envuelto = (saved as { documento?: { id?: unknown } }).documento?.id;
  return typeof envuelto === 'number' ? envuelto : null;
}

/**
 * Formulario de alta/edición de la **cabecera** de un Cierre contable.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`.
 *
 * Como la depreciación, **sus líneas no se teclean**: el botón "Cargar" abre un
 * modal que pide el rango de cuentas de resultado y la cuenta de cierre, y el
 * backend genera los asientos. A diferencia de ella, esas líneas SÍ son asientos
 * contables normales, así que se pintan con la tabla de la familia contable.
 *
 * Las líneas se traen **paginadas**: un cierre cierra todas las cuentas de
 * resultado del ejercicio y puede pasarse largo de lo que cabe en una página.
 */
@Component({
  selector: 'app-cierre-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    PaginatorModule,
    TextareaModule,
    FieldErrorComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ContableDocumentoLineasTableComponent,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './cierre-form.component.html',
  styleUrl: './cierre-form.component.scss',
})
export class CierreFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly cierreService = inject(CierreService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialog = inject(DialogService);

  protected readonly t = this.i18n.t;

  /** Catálogo de centros de costo (el "grupo" del ERP anterior). */
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;
  protected readonly pageSize = CIERRE_DETALLE_PAGE_SIZE;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  /** Cabecera pre-cargada por `editableDocumentResolver` (clave de ruta `documentoEdit`). */
  readonly documentoEdit = input<unknown>();

  protected readonly isEditMode = computed(() => !!this.id());

  /** Id del documento como número (`null` en alta). */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });

  protected readonly isSaving = signal(false);
  /** `cargar-cierre/` o el borrado masivo en vuelo; bloquea ambos botones. */
  protected readonly isBusyLineas = signal(false);
  protected readonly isLoadingLineas = signal(false);

  /** Página actual de líneas (0-based, como el paginador de PrimeNG). */
  protected readonly page = signal(0);
  protected readonly totalLineas = signal(0);
  /** Líneas de la página actual, mapeadas a la forma que pinta la tabla contable. */
  protected readonly lines = signal<readonly CuentaDetalleFormRawValue[]>([]);

  /** Estado del documento: aprobado o anulado congela las acciones sobre líneas. */
  protected readonly isCongelado = signal(false);

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
    // Sin fecha por defecto: el cierre es siempre un 31 de diciembre, y sembrar
    // "hoy" dejaría el campo en error apenas se abre el formulario.
    fecha: this.fb.control<Date | null>(null, [Validators.required, fecha31Diciembre()]),
    centro_costo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as CierreRead);
    } else {
      this.loadCabecera(Number(id));
    }
    this.loadLineas(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.cierre.form.toasts;
    const payload = formValueToPayload(this.form.getRawValue(), this.document().documentTypeId);

    this.isSaving.set(true);
    const operation = id
      ? this.gateway.update(this.document(), Number(id), payload)
      : this.gateway.create(this.document(), payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        if (id) {
          this.toast.success(toasts.editSuccess.title, toasts.editSuccess.desc);
          this.navigateToList();
          return;
        }
        // Recién creado: el cierre no sirve vacío y cargarlo necesita su id, así
        // que se entra directo a editarlo (mismo criterio que la depreciación).
        this.toast.success(toasts.createSuccess.title, toasts.createSuccess.desc);
        const newId = extractDocumentoId(saved);
        if (newId != null) this.navigateToEdit(newId);
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
   * Abre el modal del rango de cuentas y, con lo elegido, pide al backend generar
   * las líneas del cierre. El modal solo selecciona; la llamada ocurre acá.
   */
  protected onCargar(): void {
    const id = this.documentId();
    if (id == null || this.isBusyLineas()) return;

    from(import('../../components/cargar-cierre-modal/cargar-cierre-modal.component'))
      .pipe(
        switchMap(({ CargarCierreModalComponent }) => {
          const ref = this.dialog.open(CargarCierreModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '40rem',
          });
          return ref ? ref.onClose : EMPTY;
        }),
        // El modal cierra con `null` al cancelar.
        filter((seleccion: unknown): seleccion is CargarCierreSeleccion => seleccion != null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((seleccion) => this.cargarCierre(id, seleccion));
  }

  private cargarCierre(id: number, seleccion: CargarCierreSeleccion): void {
    this.isBusyLineas.set(true);
    const toasts = this.t().entities.cierre.form.toasts;
    this.cierreService
      .cargarCierre({
        id,
        cuenta_desde_codigo: seleccion.cuentaDesdeCodigo,
        cuenta_hasta_codigo: seleccion.cuentaHastaCodigo,
        cuenta_cierre_id: seleccion.cuentaCierreId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isBusyLineas.set(false);
          this.toast.success(toasts.cargarSuccess.title, toasts.cargarSuccess.desc);
          // Vuelve a la primera página: las líneas anteriores ya no aplican.
          this.page.set(0);
          this.loadLineas(id);
        },
        error: () => {
          this.isBusyLineas.set(false);
          this.toast.error(toasts.cargarError.title, toasts.cargarError.desc);
        },
      });
  }

  /** Borra TODAS las líneas del documento, previa confirmación destructiva. */
  protected onEliminarTodos(): void {
    const id = this.documentId();
    if (id == null || this.isBusyLineas()) return;

    const labels = this.t().entities.cierre.form;
    this.confirmation.confirm({
      header: labels.confirmDeleteAll.header,
      message: labels.confirmDeleteAll.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarTodos(id),
    });
  }

  private eliminarTodos(id: number): void {
    this.isBusyLineas.set(true);
    const toasts = this.t().entities.cierre.form.toasts;
    this.cierreService
      .eliminarDetalles(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isBusyLineas.set(false);
          this.toast.success(toasts.deleteAllSuccess.title, toasts.deleteAllSuccess.desc);
          this.page.set(0);
          this.loadLineas(id);
        },
        error: () => {
          this.isBusyLineas.set(false);
          this.toast.error(toasts.deleteAllError.title, toasts.deleteAllError.desc);
        },
      });
  }

  protected onPageChange(event: PaginatorState): void {
    const id = this.documentId();
    if (id == null) return;
    this.page.set(event.page ?? 0);
    this.loadLineas(id);
  }

  /** Carga solo la cabecera (fallback cuando el resolver no la pre-cargó). */
  private loadCabecera(id: number): void {
    this.gateway
      .getById(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cabecera) => this.applyCabecera(cabecera as CierreRead),
        error: () => {
          const toasts = this.t().entities.cierre.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Trae la página actual de líneas. */
  private loadLineas(id: number): void {
    this.isLoadingLineas.set(true);
    this.detalleService
      .listarPaginadoPorDocumento<CuentaDetalleRead>(id, this.page() + 1, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isLoadingLineas.set(false);
          this.totalLineas.set(res.count);
          this.lines.set(res.results.map(cuentaDetalleToFormValue));
        },
        error: () => {
          this.isLoadingLineas.set(false);
          const toasts = this.t().entities.cierre.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private applyCabecera(read: CierreRead): void {
    this.form.patchValue(cierreToFormValue(read), { emitEvent: false });
    // Aprobado o anulado: el documento ya no admite regenerar ni borrar líneas.
    this.isCongelado.set(!!read.estado_aprobado || !!read.estado_anulado);
  }

  private navigateToList(): void {
    this.navigate(this.document().routes.list);
  }

  private navigateToEdit(id: number): void {
    this.navigate(this.document().routes.edit, String(id));
  }

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
