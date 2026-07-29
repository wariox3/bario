import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { FieldErrorComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
  type ErpSelectOption,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ConciliacionDetallesTabComponent } from '../../components/conciliacion-detalles-tab/conciliacion-detalles-tab.component';
import { ConciliacionSoportesTabComponent } from '../../components/conciliacion-soportes-tab/conciliacion-soportes-tab.component';
import { CONCILIACION_LIST_PATH, CUENTA_BANCO_ENDPOINT } from '../../conciliacion.constants';
import { conciliacionToFormValue, formValueToPayload } from '../../conciliacion.mapper';
import type { Conciliacion } from '../../conciliacion.model';
import { ConciliacionService } from '../../conciliacion.service';
import { rangoFechasValido } from '../../conciliacion.validators';

/**
 * Alta/edición de una **conciliación bancaria** y, en edición, su banco de
 * trabajo.
 *
 * La cabecera es corta —periodo y cuenta bancaria— y debajo, **solo cuando el
 * registro existe**, aparecen las dos pestañas donde ocurre el proceso: cargar
 * los movimientos del libro, importar el extracto del banco y cruzarlos.
 *
 * Mismo criterio que la depreciación y el cierre: lo que necesita el id del
 * registro vive en la edición, y al crear se entra derecho a editarlo.
 *
 * "Conciliar" toca las dos colecciones, así que cuando la pestaña del libro
 * avisa que corrió, se incrementa el token que fuerza a la del extracto a
 * recargarse.
 */
@Component({
  selector: 'app-conciliacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    DatePickerModule,
    TabsModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    ConciliacionDetallesTabComponent,
    ConciliacionSoportesTabComponent,
  ],
  templateUrl: './conciliacion-form.component.html',
  styleUrl: './conciliacion-form.component.scss',
})
export class ConciliacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConciliacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly cuentaBancoEndpoint = CUENTA_BANCO_ENDPOINT;

  /** Id del registro a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly conciliacionId = computed(() => {
    const id = this.id();
    return id ? Number(id) : 0;
  });

  protected readonly isSaving = signal(false);
  protected readonly activeTab = signal<'detalles' | 'soporte'>('detalles');

  /** Se incrementa tras conciliar para que la pestaña del extracto se refresque. */
  protected readonly soporteReloadToken = signal(0);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.conciliacion.name,
        routerLink: slug ? ['/t', slug, ...CONCILIACION_LIST_PATH] : undefined,
      },
      {
        label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
      },
    ];
  });

  protected readonly form = this.fb.group(
    {
      fecha_desde: this.fb.control<Date | null>(startOfToday(), Validators.required),
      fecha_hasta: this.fb.control<Date | null>(startOfToday(), Validators.required),
      cuenta_banco: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    },
    { validators: rangoFechasValido() },
  );

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadConciliacion(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.conciliacion.form.toasts;
    const payload = formValueToPayload(this.form.getRawValue());

    this.isSaving.set(true);
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        if (id) {
          this.toast.success(toasts.editSuccess.title, toasts.editSuccess.desc);
          this.navigateToList();
          return;
        }
        // Recién creada: el proceso necesita el id, así que se entra a editarla.
        this.toast.success(toasts.createSuccess.title, toasts.createSuccess.desc);
        if (saved?.id != null) this.navigateTo('editar', saved.id);
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

  /** El cruce corrió: la pestaña del extracto quedó desactualizada. */
  protected onConciliado(): void {
    this.soporteReloadToken.update((n) => n + 1);
  }

  private loadConciliacion(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Conciliacion) =>
          this.form.patchValue(conciliacionToFormValue(read), { emitEvent: false }),
        error: () => {
          const toasts = this.t().entities.conciliacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    this.navigateTo();
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...CONCILIACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
