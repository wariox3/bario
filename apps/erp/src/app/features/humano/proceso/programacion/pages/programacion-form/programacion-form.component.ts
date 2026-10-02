import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import {
  ErpApiSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
  MascaraFechaDirective,
} from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
  formatFechaCorta,
  startOfToday,
  type ErpSelectOption,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { GRUPOS_BANDERA, banderasDelGrupo, banderasPorDefecto } from '../../programacion.banderas';
import {
  GRUPO_ENDPOINT,
  PAGO_TIPO_ENDPOINT,
  PROGRAMACION_LIST_PATH,
} from '../../programacion.constants';
import {
  diasDelPeriodo,
  formValueToPayload,
  programacionToFormValue,
} from '../../programacion.mapper';
import { PAGO_TIPO_ID, type Programacion } from '../../programacion.model';
import { capacidadesDe } from '../../programacion.estado';
import { ProgramacionService } from '../../programacion.service';
import {
  duracionPeriodoExacta,
  exigeDuracionExacta,
  fechaHastaDelPeriodo,
  rangoFechasValido,
  type DuracionPeriodoError,
} from '../../programacion.validators';

/** Defaults de las banderas, en un solo lugar (ver `programacion.banderas.ts`). */
const DEFAULTS = banderasPorDefecto();

/**
 * Alta y edición de la **cabecera** de una programación de nómina: el periodo, el
 * grupo, el tipo de pago y las 17 banderas que deciden qué se liquida.
 *
 * Dos comportamientos reactivos, los dos heredados del ERP anterior:
 *
 * 1. **El grupo manda el periodo.** Su `periodo_dias` es contra lo que se valida
 *    el rango de fechas. El periodo en sí no se manda: el backend lo toma del
 *    grupo.
 * 2. **El tipo de pago cambia la validación.** Prima, cesantía e interés se
 *    liquidan por rangos libres y solo piden `desde ≤ hasta`; el resto —la
 *    nómina, y el tipo que se sume— debe durar exactamente el periodo del grupo
 *    (`exigeDuracionExacta`).
 *
 * En alta el tipo de pago arranca en nómina, el caso de todas las quincenas.
 *
 * Las dos reglas del rango viven **en `fecha_hasta`**, no en el grupo: el error
 * sale debajo de ese campo y en el momento en que la persona lo provoca, sea
 * moviendo una fecha o eligiendo un grupo cuyo periodo no calza.
 *
 * El formulario **solo se abre sobre un borrador**: una programación generada
 * tiene la cabecera congelada (`capacidadesDe`). Si se entra por URL a una que ya
 * no lo es, se redirige al workspace en vez de dejar editar.
 */
@Component({
  selector: 'app-programacion-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    MascaraFechaDirective,
    InputTextModule,
    TextareaModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpApiSelectComponent,
  ],
  templateUrl: './programacion-form.component.html',
  styleUrl: './programacion-form.component.scss',
})
export class ProgramacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProgramacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly pagoTipoEndpoint = PAGO_TIPO_ENDPOINT;
  protected readonly grupoEndpoint = GRUPO_ENDPOINT;

  /** Bloques de banderas y sus campos, desde la metadata. */
  protected readonly gruposBandera = GRUPOS_BANDERA;
  protected readonly banderasDelGrupo = banderasDelGrupo;

  /**
   * Resuelve una clave i18n en punto (`entities.programacion.banderas.pagoHoras`).
   * Las banderas se renderizan en bucle desde la metadata, así que su etiqueta no
   * se puede escribir con el acceso tipado `t().…`.
   */
  protected readonly traducir = (clave: string): string => this.i18n.translate(clave);

  /** Id a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  /**
   * Catálogo de grupos que cargó el select. En edición el grupo llega sin
   * `periodo_dias` y de acá sale (ver `diasDelPeriodo`).
   */
  private readonly gruposCatalogo = signal<readonly ErpSelectOption[]>([]);

  /** Días del periodo contra los que se valida hoy el rango; `0` si no aplica. */
  private readonly diasPeriodo = signal(0);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.programacion.name,
        routerLink: slug ? ['/t', slug, ...PROGRAMACION_LIST_PATH] : undefined,
      },
      {
        label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
      },
    ];
  });

  protected readonly form = this.fb.group({
    nombre: this.fb.control<string | null>(null, Validators.maxLength(100)),
    fecha_desde: this.fb.control<Date | null>(primerDiaDelMes(), Validators.required),
    // Sus validadores los arma `aplicarValidacionPeriodo`.
    fecha_hasta: this.fb.control<Date | null>(ultimoDiaDelMes()),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    pago_tipo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    grupo: this.fb.control<ErpSelectOption | null>(null, Validators.required),

    // Las 17 banderas. Se declaran una por una **a propósito**, aunque la
    // metadata las describa: así `getRawValue()` satisface
    // `ProgramacionFormRawValue` (que extiende `ProgramacionBanderas`) y el
    // compilador avisa si alguna falta. Un spread dinámico compila con el
    // formulario incompleto y falla en runtime. Los defaults sí salen de un
    // solo lugar: `banderasPorDefecto()`.
    pago_horas: this.fb.control<boolean>(DEFAULTS.pago_horas, { nonNullable: true }),
    pago_auxilio_transporte: this.fb.control<boolean>(DEFAULTS.pago_auxilio_transporte, {
      nonNullable: true,
    }),
    pago_incapacidad: this.fb.control<boolean>(DEFAULTS.pago_incapacidad, {
      nonNullable: true,
    }),
    pago_licencia: this.fb.control<boolean>(DEFAULTS.pago_licencia, { nonNullable: true }),
    pago_vacacion: this.fb.control<boolean>(DEFAULTS.pago_vacacion, { nonNullable: true }),
    pago_prima: this.fb.control<boolean>(DEFAULTS.pago_prima, { nonNullable: true }),
    pago_cesantia: this.fb.control<boolean>(DEFAULTS.pago_cesantia, { nonNullable: true }),
    pago_interes: this.fb.control<boolean>(DEFAULTS.pago_interes, { nonNullable: true }),
    descuento_salud: this.fb.control<boolean>(DEFAULTS.descuento_salud, { nonNullable: true }),
    descuento_pension: this.fb.control<boolean>(DEFAULTS.descuento_pension, {
      nonNullable: true,
    }),
    descuento_fondo_solidaridad: this.fb.control<boolean>(DEFAULTS.descuento_fondo_solidaridad, {
      nonNullable: true,
    }),
    descuento_retencion_fuente: this.fb.control<boolean>(DEFAULTS.descuento_retencion_fuente, {
      nonNullable: true,
    }),
    descuento_credito: this.fb.control<boolean>(DEFAULTS.descuento_credito, {
      nonNullable: true,
    }),
    descuento_embargo: this.fb.control<boolean>(DEFAULTS.descuento_embargo, {
      nonNullable: true,
    }),
    adicional: this.fb.control<boolean>(DEFAULTS.adicional, { nonNullable: true }),
    base_prestacion_minimo: this.fb.control<boolean>(DEFAULTS.base_prestacion_minimo, {
      nonNullable: true,
    }),
    base_prestacion_minimo_salario: this.fb.control<boolean>(
      DEFAULTS.base_prestacion_minimo_salario,
      { nonNullable: true },
    ),
  });

  constructor() {
    this.aplicarValidacionPeriodo();

    // Todo lo que mueve la regla del rango la revalida: el grupo (cuántos días),
    // el tipo de pago (si aplica) y la fecha desde (desde dónde se cuentan).
    const { grupo, pago_tipo, fecha_desde } = this.form.controls;
    const disparadores: readonly AbstractControl[] = [grupo, pago_tipo, fecha_desde];
    for (const control of disparadores) {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.aplicarValidacionPeriodo();
        // `<lib-field-error>` solo habla en un campo tocado. Si la persona
        // descuadró el rango desde otro campo, el aviso tiene que salir ya, no
        // cuando pase por la fecha hasta. Solo si el cambio es suyo (`dirty`):
        // el tipo de pago por defecto o la carga en edición no cuentan.
        if (control.dirty) this.form.controls.fecha_hasta.markAsTouched();
      });
    }
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadProgramacion(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;

    const id = this.id();
    const toasts = this.t().entities.programacion.form.toasts;
    const payload = formValueToPayload(this.form.getRawValue());

    this.isSaving.set(true);
    const operation = id ? this.service.update(Number(id), payload) : this.service.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Al crear, se entra al workspace: es donde se cargan los contratos y se
        // liquida. En edición se vuelve de donde se venía.
        this.navigateTo('detalle', saved?.id ?? Number(id));
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    const id = this.id();
    if (id) this.navigateTo('detalle', Number(id));
    else this.navigateTo();
  }

  /**
   * En alta, el tipo de pago arranca en nómina. Se elige por id sobre el
   * catálogo cargado —no por posición, que depende del orden del backend— y
   * sin pisar lo que la persona ya haya elegido.
   */
  protected onPagoTiposCargados(opciones: readonly ErpSelectOption[]): void {
    const control = this.form.controls.pago_tipo;
    if (this.isEditMode() || control.value) return;
    const nomina = opciones.find((opcion) => opcion.id === PAGO_TIPO_ID.NOMINA);
    if (nomina) control.setValue(nomina);
  }

  /**
   * El error de duración de `fecha_hasta` con sus números: cuánto debe durar el
   * rango y cuánto dura. `null` mientras el campo no se haya tocado, igual que
   * `<lib-field-error>`, que pinta los demás errores del campo.
   */
  protected mensajeDuracion(): string | null {
    const control = this.form.controls.fecha_hasta;
    if (!control.touched && !control.dirty) return null;
    const error = control.errors?.['duracionPeriodo'] as DuracionPeriodoError | undefined;
    if (!error) return null;
    return this.t()
      .entities.programacion.form.validation.duracionPeriodo.replace(
        '{requeridos}',
        String(error.requeridos),
      )
      .replace('{duracion}', String(error.duracion));
  }

  /**
   * La salida del error de duración, nombrando la fecha a la que lleva
   * (`Usar 15/10/2026`) en vez de un «corregir» genérico.
   */
  protected etiquetaUsarSugerida(): string | null {
    const desde = this.form.controls.fecha_desde.value;
    const dias = this.diasPeriodo();
    if (!desde || dias <= 0) return null;
    const fecha = formatFechaCorta(fechaHastaDelPeriodo(desde, dias));
    return this.t().entities.programacion.form.validation.usarFechaSugerida.replace(
      '{fecha}',
      fecha,
    );
  }

  /** Lleva la fecha hasta al cierre del periodo: la salida del error de duración. */
  protected usarFechaHastaSugerida(): void {
    const desde = this.form.controls.fecha_desde.value;
    const dias = this.diasPeriodo();
    if (!desde || dias <= 0) return;
    const control = this.form.controls.fecha_hasta;
    control.setValue(fechaHastaDelPeriodo(desde, dias));
    control.markAsDirty();
  }

  /** Con el catálogo a mano, la edición ya puede validar la duración del periodo. */
  protected onGruposCargados(opciones: readonly ErpSelectOption[]): void {
    this.gruposCatalogo.set(opciones);
    this.aplicarValidacionPeriodo();
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Ajusta el validador de duración del periodo según el tipo de pago, contra
   * los días del periodo del grupo. Sin días conocidos (grupo sin elegir, o en
   * edición antes de que cargue el catálogo) el validador no opina.
   */
  private aplicarValidacionPeriodo(): void {
    const exige = exigeDuracionExacta(this.form.controls.pago_tipo.value?.id ?? null);
    const dias = exige ? diasDelPeriodo(this.form.controls.grupo.value, this.gruposCatalogo()) : 0;
    this.diasPeriodo.set(dias);

    const hasta = this.form.controls.fecha_hasta;
    hasta.setValidators([Validators.required, rangoFechasValido(), duracionPeriodoExacta(dias)]);
    hasta.updateValueAndValidity({ emitEvent: false });
  }

  private loadProgramacion(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Programacion) => {
          // Puerta de edición: una programación generada o aprobada no se edita,
          // ni siquiera entrando por URL. Se manda al workspace, que sí aplica.
          if (!capacidadesDe(read).puedeEditarCabecera) {
            const toast = this.t().entities.programacion.form.toasts.noEditable;
            this.toast.warn(toast.title, toast.desc);
            this.navigateTo('detalle', id);
            return;
          }
          this.form.patchValue(programacionToFormValue(read), { emitEvent: false });
          this.aplicarValidacionPeriodo();
        },
        error: () => {
          const toasts = this.t().entities.programacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...PROGRAMACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}

/** Primer día del mes en curso: el arranque natural de un periodo de nómina. */
function primerDiaDelMes(): Date {
  const hoy = startOfToday();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/**
 * Último día del mes en curso. El legacy sembraba las fechas con el primer
 * día, lo que dejaba el formulario en error de duración desde el arranque; sembrar
 * el mes completo es el caso más común y arranca válido.
 */
function ultimoDiaDelMes(): Date {
  const hoy = startOfToday();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}
