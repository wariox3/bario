import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import { FormErrorService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@turnos/i18n';
import { SecuenciaService } from '../../secuencia.service';
import {
  SECUENCIA_LIST_PATH,
  SECUENCIA_MONTH_DAYS,
  SECUENCIA_WEEKDAYS,
} from '../../secuencia.constants';
import { secuenciaToFormValue, formValueToPayload } from '../../secuencia.mapper';
import { UppercaseDirective } from '@reddoc/ui';

/** Item del error puntual del backend cuando un código de turno digitado no existe. */
interface TurnoInexistente {
  readonly campo: string;
  readonly codigo: string;
  readonly mensaje: string;
}

/**
 * Formulario de alta/edición de secuencia.
 *
 * Master del módulo Turno (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 *
 * Los días del mes (`dia_1..dia_31`) y de semana (`lunes..domingo`, festivos)
 * son inputs de texto libre con el código del turno; `dias` es numérico y
 * requerido y `homologar` un checkbox. `codigo`/`horas`/`estado_inactivo` no se
 * capturan aquí (no se envían al backend desde el formulario).
 */
@Component({
  selector: 'app-secuencia-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    FieldErrorComponent,
    UppercaseDirective,
    NgClass,
  ],
  templateUrl: './secuencia-form.component.html',
  styleUrl: './secuencia-form.component.scss',
})
export class SecuenciaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly secuenciaService = inject(SecuenciaService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly monthDays = SECUENCIA_MONTH_DAYS;
  protected readonly weekdays = SECUENCIA_WEEKDAYS;

  /** Id de la secuencia a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.secuencia.name,
        routerLink: slug ? ['/t', slug, ...SECUENCIA_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    dias: this.fb.control<number | null>(null, Validators.required),
    homologar: this.fb.control(false, { nonNullable: true }),
    dia_1: [''],
    dia_2: [''],
    dia_3: [''],
    dia_4: [''],
    dia_5: [''],
    dia_6: [''],
    dia_7: [''],
    dia_8: [''],
    dia_9: [''],
    dia_10: [''],
    dia_11: [''],
    dia_12: [''],
    dia_13: [''],
    dia_14: [''],
    dia_15: [''],
    dia_16: [''],
    dia_17: [''],
    dia_18: [''],
    dia_19: [''],
    dia_20: [''],
    dia_21: [''],
    dia_22: [''],
    dia_23: [''],
    dia_24: [''],
    dia_25: [''],
    dia_26: [''],
    dia_27: [''],
    dia_28: [''],
    dia_29: [''],
    dia_30: [''],
    dia_31: [''],
    lunes: [''],
    martes: [''],
    miercoles: [''],
    jueves: [''],
    viernes: [''],
    sabado: [''],
    domingo: [''],
    festivo: [''],
    domingo_festivo: [''],
  });

  /**
   * Celdas del grid (`dia_N` / día de semana) que el backend marcó porque su
   * código de turno no existe → mensaje. Se usan para resaltar la celda y mostrar
   * el detalle en su `title`. Se limpian al editar cualquier campo.
   */
  protected readonly turnoErrors = signal<ReadonlyMap<string, string>>(new Map());

  constructor() {
    // Al tocar cualquier celda, retira el resaltado de turnos inexistentes.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.turnoErrors().size) this.turnoErrors.set(new Map());
    });
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadSecuencia(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.secuencia.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.secuenciaService.update(Number(id), payload)
      : this.secuenciaService.create(payload);

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
        if (this.handleTurnoErrors(err, fail.title)) return;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  /**
   * Maneja el error puntual del backend de secuencia cuando uno o más códigos de
   * turno digitados no existen:
   * `{ detail: [...], errores: [{ campo, codigo, mensaje }] }`.
   *
   * Resalta las celdas afectadas (con su mensaje en el `title`) y muestra el
   * `detail` en un toast. Devuelve `true` si el error tenía esta forma (y ya quedó
   * manejado); `false` para que el caller siga con el manejo genérico.
   */
  private handleTurnoErrors(err: unknown, fallbackTitle: string): boolean {
    if (!(err instanceof HttpErrorResponse)) return false;
    const body = err.error as { detail?: unknown; errores?: unknown } | null;
    if (!body || !Array.isArray(body.errores)) return false;

    const map = new Map<string, string>();
    for (const item of body.errores) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as TurnoInexistente).campo === 'string'
      ) {
        const { campo, mensaje } = item as TurnoInexistente;
        map.set(campo, mensaje ?? '');
      }
    }
    if (map.size === 0) return false;

    this.turnoErrors.set(map);
    const detail =
      Array.isArray(body.detail) && typeof body.detail[0] === 'string' ? body.detail[0] : undefined;
    this.toast.error(fallbackTitle, detail);
    return true;
  }

  protected onCancel(): void {
    this.navigateToList();
  }

  /**
   * Resuelve una clave i18n con notación de punto contra el diccionario activo.
   * Se usa para los labels de los días de semana, que vienen como `labelKey` en
   * `SECUENCIA_WEEKDAYS`. Si la clave no existe devuelve la clave misma.
   */
  protected translate(key: string): string {
    const dict: unknown = this.t();
    let current: unknown = dict;
    for (const part of key.split('.')) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }

  private loadSecuencia(id: number): void {
    this.secuenciaService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.form.patchValue(secuenciaToFormValue(s));
        },
        error: () => {
          const toasts = this.t().entities.secuencia.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...SECUENCIA_LIST_PATH]);
  }
}
