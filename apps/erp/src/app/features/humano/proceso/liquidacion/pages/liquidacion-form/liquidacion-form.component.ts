import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { FocusInvalidDirective, MascaraFechaDirective, PageActionsComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { LIQUIDACION_LIST_PATH } from '../../liquidacion.constants';
import { capacidadesDe } from '../../liquidacion.estado';
import { formValueToPatch, liquidacionToFormValue } from '../../liquidacion.mapper';
import type { Liquidacion } from '../../liquidacion.model';
import { LiquidacionService } from '../../liquidacion.service';

/** Largo máximo del comentario. */
const COMENTARIO_MAX = 500;

/**
 * Edición de la **cabecera** de una liquidación: el comentario y desde cuándo se
 * cuenta cada prestación (las cuatro fechas de último pago).
 *
 * Solo edición, no alta: la liquidación la fabrica el backend al terminar un
 * contrato. Y solo esos cinco campos, que van por `PATCH`: el periodo, el
 * contrato y los valores no se tocan desde acá.
 *
 * Cambiar una fecha **no recalcula** nada por sí solo: se guarda y después se
 * reliquida desde el workspace. Por eso el toast de éxito lo recuerda.
 *
 * El formulario **solo se abre sobre un borrador**. Si se entra por URL a una
 * liquidación generada o aprobada, se redirige al workspace en vez de dejar
 * editar.
 */
@Component({
  selector: 'app-liquidacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    DatePickerModule,
    TextareaModule,
    MascaraFechaDirective,
    FocusInvalidDirective,
    PageActionsComponent,
  ],
  templateUrl: './liquidacion-form.component.html',
  host: { class: 'flex flex-col gap-6' },
})
export class LiquidacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(LiquidacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly comentarioMax = COMENTARIO_MAX;

  /** Id a editar (route param `:id`). */
  readonly id = input.required<string>();

  protected readonly isSaving = signal(false);
  /** Empleado de la liquidación, para el subtítulo. */
  protected readonly empleado = signal<string | null>(null);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.liquidacion.name,
        routerLink: slug ? ['/t', slug, ...LIQUIDACION_LIST_PATH] : undefined,
      },
      { label: this.t().common.actions.edit },
    ];
  });

  protected readonly form = this.fb.group({
    fecha_ultimo_pago: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_cesantia: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_prima: this.fb.control<Date | null>(null),
    fecha_ultimo_pago_vacacion: this.fb.control<Date | null>(null),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(COMENTARIO_MAX)),
  });

  ngOnInit(): void {
    this.load(Number(this.id()));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;

    const id = Number(this.id());
    const toasts = this.t().entities.liquidacion.form.toasts;
    this.isSaving.set(true);

    this.service
      .actualizar(id, formValueToPatch(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toast.success(toasts.editSuccess.title, toasts.editSuccess.desc);
          this.navigateTo('detalle', id);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.editError.title);
        },
      });
  }

  protected onCancel(): void {
    this.navigateTo('detalle', Number(this.id()));
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Liquidacion) => {
          // Puerta de edición: una liquidación generada o aprobada no se edita,
          // ni siquiera entrando por URL. Se manda al workspace.
          if (!capacidadesDe(read).puedeEditarCabecera) {
            const toast = this.t().entities.liquidacion.form.toasts.noEditable;
            this.toast.warn(toast.title, toast.desc);
            this.navigateTo('detalle', id);
            return;
          }
          this.empleado.set(read.contrato_nombre);
          this.form.patchValue(liquidacionToFormValue(read), { emitEvent: false });
        },
        error: () => {
          const toasts = this.t().entities.liquidacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...LIQUIDACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
