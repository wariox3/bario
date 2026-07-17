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
import { FieldErrorComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
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
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import type { AppDict } from '@erp/i18n';
import { ContableDocumentoDetallesComponent } from '@erp/features/documentos/contable/components/contable-documento-detalles/contable-documento-detalles.component';
import {
  createCuentaDetalleGroup,
  type CuentaDetalleGroup,
} from '@erp/features/documentos/contable/contable-documento-detalle.form';
import {
  calcularResumenContable,
  cuentaDetalleToFormValue,
} from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '@erp/features/documentos/contable/contable-documento-detalle.model';
import { CUENTA_BANCO_ENDPOINT } from '../../egreso.constants';
import { egresoToFormValue, formValueToPayload } from '../../egreso.mapper';
import type { EgresoRead } from '../../egreso.model';

/**
 * Formulario de alta/edición de la **cabecera** de un Egreso (desembolso de
 * tesorería). Espejo del `PagoFormComponent` de cartera, en sentido CxP.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista.
 *
 * No es de la familia comercial: sus líneas son **asientos contables** (cuenta +
 * naturaleza + valor), así que compone la tabla contable compartida con sus
 * columnas de contacto, centro de costo y base prendidas y el cruce de CxP
 * (`carteraTipo='pagar'`). El neto (`débitos − créditos`) es el desembolso, y
 * el backend lo recibe en `total`.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-egreso-form',
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
    ContableDocumentoDetallesComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './egreso-form.component.html',
  styleUrl: './egreso-form.component.scss',
})
export class EgresoFormComponent implements OnInit, CanComponentDeactivate {
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
  private readonly detallesTable = viewChild(ContableDocumentoDetallesComponent);

  /** Catálogo de la cuenta bancaria de donde sale el desembolso. */
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

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
    cuenta_banco: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<CuentaDetalleGroup>([]),
  });

  /**
   * Espejo en signal del contacto de la cabecera, para que la tabla siembre con
   * él cada línea nueva. Se escribe en los dos únicos puntos donde el contacto
   * cambia —la elección del usuario y la carga en edición—; esta última patchea
   * con `emitEvent: false`, así que no basta con seguir `valueChanges`.
   */
  protected readonly contactoCabecera = signal<ErpSelectOption | null>(null);

  constructor() {
    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => {
        this.contactoCabecera.set(contacto);
        this.propagarContactoALineas(contacto);
      });
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as EgresoRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    // El desembolso no puede ser negativo: los créditos (descuentos, retenciones)
    // no pueden superar a los débitos que pagan la cartera.
    if (this.totalNeto() < 0) {
      const toast = this.t().entities.egreso.form.toasts.negativeTotal;
      this.toast.error(toast.title, toast.desc);
      return;
    }

    const id = this.id();
    const detalles = this.detallesTable();
    // En edición las líneas transaccionan aparte (no viajan en el payload de la
    // cabecera). Para que no se pierdan, antes de guardar el documento se
    // flushean las pendientes; si hay líneas incompletas se avisa y se aborta.
    if (id && detalles) {
      if (detalles.hasInvalidPending()) {
        const toast = this.t().entities.cuentaDetalle.toasts.incompleteLines;
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
              const toast = this.t().entities.cuentaDetalle.toasts.lineSaveError;
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
    const toasts = this.t().entities.egreso.form.toasts;
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
   * En edición, "agregar documento" persiste las líneas vía `masivo/`; acá se
   * recargan para reflejar los ids y montos autoritativos del backend. En alta
   * no aplica: las líneas entran directo al `FormArray`.
   */
  protected onDocumentosAgregados(): void {
    const id = this.id();
    if (id) this.loadLineas(Number(id));
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

  /** Neto del desembolso (`débitos − créditos`), la misma cuenta que viaja en `total`. */
  private totalNeto(): number {
    return calcularResumenContable(this.form.controls.detalles.getRawValue(), 'pagar').total;
  }

  /**
   * Replica el contacto de la cabecera en las líneas que aún no se guardaron.
   *
   * Una línea libre nace con el tercero del documento, pero solo mientras sea
   * suya: las ya persistidas conservan el que tengan (cambiarlas es decisión
   * explícita del usuario, fila por fila).
   */
  private propagarContactoALineas(contacto: ErpSelectOption | null): void {
    for (const group of this.form.controls.detalles.controls) {
      if (group.controls.id.value !== null) continue;
      group.controls.contacto.setValue(contacto);
    }
  }

  /**
   * Carga completa (cabecera + líneas). Fallback de la carga inicial cuando el
   * resolver no pre-cargó la cabecera.
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<CuentaDetalleRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas }) => {
          this.applyCabecera(cabecera as EgresoRead);
          this.populateLineas(lineas);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga solo las líneas (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
    this.detalleService
      .listarPorDocumento<CuentaDetalleRead>(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lineas) => this.populateLineas(lineas),
        error: () => this.notifyLoadError(),
      });
  }

  /**
   * Pobla la cabecera en el form. `emitEvent: false`: cargar un documento no es
   * que el usuario haya elegido contacto, así que no dispara la propagación a
   * las líneas (que además llegan con el suyo desde el backend).
   */
  private applyCabecera(read: EgresoRead): void {
    const value = egresoToFormValue(read);
    this.form.patchValue(value, { emitEvent: false });
    // Las líneas que agregue el usuario en edición nacen con el contacto del
    // documento, igual que en alta.
    this.contactoCabecera.set(value.contacto ?? null);
  }

  /** Reemplaza el FormArray de detalles con las líneas recibidas. */
  private populateLineas(lineas: readonly CuentaDetalleRead[]): void {
    const detalles = this.form.controls.detalles;
    detalles.clear();
    for (const line of lineas)
      detalles.push(createCuentaDetalleGroup(cuentaDetalleToFormValue(line)));
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.egreso.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Vuelve a la lista del documento, derivando tenant y módulo activos. */
  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = this.document().routes.list.split('/').filter(Boolean);
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...segments]);
  }
}
