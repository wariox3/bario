import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { startWith } from 'rxjs';
import {
  CUENTA_BANCO_TIPO_CAJA,
  FormErrorService,
  I18nService,
  ToastService,
  type ErpSelectOption,
} from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { CuentasCobroService, type CuentaCobro } from '../../../vender/cobro/cuentas-cobro';
import { CAJA_SELECT_ENDPOINT } from '../../turno.constants';
import type { Turno } from '../../turno.model';
import { TurnoService } from '../../turno.service';

type EstadoCuentas = 'cargando' | 'listo' | 'error';

/** Con base mayor que cero hay que decir en qué cuenta queda. */
function cuentaSiHayBase(control: AbstractControl): ValidationErrors | null {
  const base = Number(control.parent?.get('base')?.value ?? 0);
  return base > 0 && control.value === null ? { required: true } : null;
}

/**
 * Abrir turno: la caja, la base con la que arranca y la cuenta de efectivo
 * donde queda esa base, obligatoria solo con base. Emite el turno abierto y
 * se cierra.
 */
@Component({
  selector: 'app-abrir-turno-dialog',
  standalone: true,
  host: { class: 'contents' },
  imports: [
    ReactiveFormsModule,
    FocusInvalidDirective,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
  ],
  templateUrl: './abrir-turno-dialog.component.html',
})
export class AbrirTurnoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TurnoService);
  private readonly cuentasCobro = inject(CuentasCobroService);
  private readonly formErrors = inject(FormErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly abierto = output<Turno>();

  protected readonly cajaEndpoint = CAJA_SELECT_ENDPOINT;
  protected readonly guardando = signal(false);
  protected readonly estadoCuentas = signal<EstadoCuentas>('cargando');
  private readonly cuentas = signal<readonly CuentaCobro[]>([]);
  /** Solo las cuentas de tipo caja: la base es efectivo. */
  protected readonly cuentasEfectivo = computed(() =>
    this.cuentas().filter((c) => c.tipo === CUENTA_BANCO_TIPO_CAJA),
  );

  protected readonly form = this.fb.group({
    caja: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    base: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    cuenta: this.fb.control<ErpSelectOption | null>(null, cuentaSiHayBase),
  });

  private readonly base = toSignal(
    this.form.controls.base.valueChanges.pipe(startWith(this.form.controls.base.value)),
    { initialValue: 0 },
  );
  protected readonly conBase = computed(() => (this.base() ?? 0) > 0);

  constructor() {
    // La cuenta pasa a ser obligatoria en cuanto hay base: se revalida con ella.
    this.form.controls.base.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.cuenta.updateValueAndValidity());

    // Cada apertura arranca limpia y con las cuentas al día (una recién creada en el ERP).
    effect(() => {
      if (!this.visible()) return;
      this.form.reset({ caja: null, base: 0, cuenta: null });
      this.cargarCuentas();
    });
  }

  protected cargarCuentas(): void {
    this.estadoCuentas.set('cargando');
    this.cuentasCobro
      .cuentas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuentas) => {
          this.cuentas.set(cuentas);
          this.estadoCuentas.set('listo');
          // Con una sola cuenta de efectivo no hay nada que elegir.
          const efectivo = this.cuentasEfectivo();
          if (efectivo.length === 1 && !this.form.controls.cuenta.value) {
            this.form.controls.cuenta.setValue(efectivo[0]);
          }
        },
        error: () => this.estadoCuentas.set('error'),
      });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.guardando()) return;
    const { caja, base, cuenta } = this.form.getRawValue();
    if (!caja) return;
    const montoBase = base ?? 0;

    this.guardando.set(true);
    this.service
      .abrir({
        caja: caja.id,
        base: montoBase,
        cuenta_banco: montoBase > 0 ? (cuenta?.id ?? null) : null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.guardando.set(false);
          const tx = this.t().turno.abrir.toasts.exito;
          this.toast.success(tx.title, tx.desc);
          this.abierto.emit(turno);
          this.visibleChange.emit(false);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.formErrors.handle(this.form, err, this.t().turno.abrir.toasts.error.title, {
            cuenta_banco: 'cuenta',
          });
        },
      });
  }
}
