import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  startOfToday,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpApiSelectComponent, ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { DocumentoDetalleService, ENTITY_DATA_GATEWAY } from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { DepreciacionLineasTableComponent } from '../../components/depreciacion-lineas-table/depreciacion-lineas-table.component';
import { depreciacionLineaToView, sumarLineasDepreciacion } from '../../depreciacion-linea.mapper';
import type { DepreciacionLineaRead, DepreciacionLineaView } from '../../depreciacion-linea.model';
import { depreciacionToFormValue, formValueToPayload } from '../../depreciacion.mapper';
import type { DepreciacionRead } from '../../depreciacion.model';
import { DepreciacionService } from '../../depreciacion.service';

/**
 * Saca el id del documento de la respuesta de creación.
 *
 * ⚠️ El gateway devuelve el body crudo del `POST` y **no está verificado** si el
 * backend responde el documento plano o envuelto en `{ documento: … }` (así lo
 * hacía el ERP anterior). Se contemplan las dos formas; si no aparece por
 * ninguna, el llamador cae a la lista en vez de navegar a una URL inválida.
 */
function extractDocumentoId(saved: unknown): number | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const plano = (saved as { id?: unknown }).id;
  if (typeof plano === 'number') return plano;
  const envuelto = (saved as { documento?: { id?: unknown } }).documento?.id;
  return typeof envuelto === 'number' ? envuelto : null;
}

/**
 * Formulario de alta/edición de la **cabecera** de una Depreciación.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre).
 *
 * Lo que lo distingue de los demás documentos: **sus líneas no se teclean**. El
 * botón "Cargar activos" le pide al backend que las genere desde los activos
 * fijos, y el form solo las muestra (y deja eliminarlas). Como esa operación
 * necesita el id del documento, en alta la sección de líneas no existe todavía:
 * al guardar se navega a la edición del documento recién creado, que es donde
 * se cargan.
 */
@Component({
  selector: 'app-depreciacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    TextareaModule,
    FieldErrorComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    DepreciacionLineasTableComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './depreciacion-form.component.html',
  styleUrl: './depreciacion-form.component.scss',
})
export class DepreciacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly depreciacionService = inject(DepreciacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly t = this.i18n.t;

  /** Catálogo de grupos de contabilidad. */
  protected readonly grupoEndpoint = SELECT_ENDPOINTS.grupoContabilidad;

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

  /** Id del documento como número (`null` en alta). */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });

  protected readonly isSaving = signal(false);
  /** `cargar-activo/` en vuelo; bloquea el botón para no duplicar la generación. */
  protected readonly isLoadingActivos = signal(false);

  /** Líneas generadas por el backend. Solo lectura: el form no las construye. */
  protected readonly lines = signal<readonly DepreciacionLineaView[]>([]);

  /** Total depreciado; es el que viaja en la cabecera al guardar. */
  protected readonly total = computed(() => sumarLineasDepreciacion(this.lines()));

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
    grupo_contabilidad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as DepreciacionRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.depreciacion.form.toasts;
    const payload = formValueToPayload(
      this.form.getRawValue(),
      this.document().documentTypeId,
      this.total(),
    );

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
        // Recién creado: el documento no sirve de nada vacío y cargar los activos
        // necesita su id, así que se entra directo a editarlo en vez de volver a
        // la lista y obligar al usuario a buscarlo.
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
   * Pide al backend generar las líneas desde los activos fijos. Si ya hay
   * líneas confirma antes: no sabemos si el backend acumula o reemplaza, así
   * que la decisión queda del lado del usuario (ver PENDIENTES).
   */
  protected onCargarActivos(): void {
    if (this.isLoadingActivos()) return;
    if (this.lines().length === 0) {
      this.cargarActivos();
      return;
    }

    const labels = this.t().entities.depreciacion.form;
    this.confirmation.confirm({
      header: labels.confirmReload.header,
      message: labels.confirmReload.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.cargarActivos,
      rejectLabel: this.t().common.actions.cancel,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.cargarActivos(),
    });
  }

  private cargarActivos(): void {
    const id = this.documentId();
    if (id == null) return;

    this.isLoadingActivos.set(true);
    const toasts = this.t().entities.depreciacion.form.toasts;
    this.depreciacionService
      .cargarActivos(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoadingActivos.set(false);
          this.toast.success(toasts.cargarSuccess.title, toasts.cargarSuccess.desc);
          // El backend es la fuente autoritativa: se recargan las líneas en vez
          // de confiar en lo que devuelva la respuesta.
          this.loadLineas(id);
        },
        error: () => {
          this.isLoadingActivos.set(false);
          this.toast.error(toasts.cargarError.title, toasts.cargarError.desc);
        },
      });
  }

  /** Pide confirmación y, al aceptar, elimina la línea contra la API. */
  protected onRemoveLinea(line: DepreciacionLineaView): void {
    if (line.id == null) return;
    this.confirmation.confirm({
      message: this.t().entities.depreciacionLinea.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLinea(line.id as number),
    });
  }

  private deleteLinea(lineId: number): void {
    this.detalleService
      .eliminar(lineId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.lines.update((lines) => lines.filter((line) => line.id !== lineId));
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  /**
   * Carga completa (cabecera + líneas). Fallback de la carga inicial cuando el
   * resolver no pre-cargó la cabecera.
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<DepreciacionLineaRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.applyCabecera(cabecera as DepreciacionRead);
          this.lines.set(lineas.map(depreciacionLineaToView));
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga solo las líneas (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
    this.detalleService
      .listarPorDocumento<DepreciacionLineaRead>(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lineas) => this.lines.set(lineas.map(depreciacionLineaToView)),
        error: () => this.notifyLoadError(),
      });
  }

  private applyCabecera(read: DepreciacionRead): void {
    this.form.patchValue(depreciacionToFormValue(read), { emitEvent: false });
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.depreciacion.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Vuelve a la lista del documento, derivando tenant y módulo activos. */
  private navigateToList(): void {
    this.navigate(this.document().routes.list);
  }

  /** Entra a editar el documento recién creado, donde se cargan los activos. */
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
