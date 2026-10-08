import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { UppercaseDirective } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { TurnoService } from '../../turno.service';
import { TURNO_LIST_PATH } from '../../turno.constants';
import { turnoToFormValue, formValueToPayload } from '../../turno.mapper';

/**
 * Formulario de alta/edición de turno (jornada).
 *
 * Master del módulo Turno (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 *
 * `hora_inicio`/`hora_fin` son inputs `type="time"`; las horas son numéricas y el
 * color usa el picker nativo. `novedad_tipo` es un `<lib-api-select>` y
 * `estado_inactivo` un checkbox.
 */
@Component({
  selector: 'app-turno-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    UppercaseDirective,
  ],
  templateUrl: './turno-form.component.html',
  styleUrl: './turno-form.component.scss',
})
export class TurnoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly turnoService = inject(TurnoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Endpoint del selector de tipo de novedad (cross-form: novedad + turno). */
  protected readonly novedadTipoEndpoint = SELECT_ENDPOINTS.novedadTipo;
  /** Referencia estable para no re-disparar el fetch del selector en cada ciclo de CD. */
  protected readonly tipoParams: Record<string, string> = { limit: '100' };

  /** Id del turno a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.turno.name,
        routerLink: slug ? ['/t', slug, ...TURNO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    hora_inicio: [''],
    hora_fin: [''],
    horas: this.fb.control<number | null>(null),
    horas_diurnas: this.fb.control<number | null>(null),
    horas_nocturnas: this.fb.control<number | null>(null),
    color: this.fb.control('#143049', { nonNullable: true }),
    novedad_tipo: this.fb.control<ErpSelectOption | null>(null),
    descanso: this.fb.control(false, { nonNullable: true }),
    estado_inactivo: this.fb.control(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadTurno(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.turno.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.turnoService.update(Number(id), payload)
      : this.turnoService.create(payload);

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

  private loadTurno(id: number): void {
    this.turnoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.form.patchValue(turnoToFormValue(turno));
        },
        error: () => {
          const toasts = this.t().entities.turno.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...TURNO_LIST_PATH]);
  }
}
