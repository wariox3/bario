import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
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
  ConfiguracionUsuarioStore,
  CUENTA_BANCO_TIPO_CAJA,
  FormErrorService,
  I18nService,
  ToastService,
  type ErpSelectOption,
} from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../configuracion/configuracion-caja.store';
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

  private readonly configuracionUsuario = inject(ConfiguracionUsuarioStore);
  private readonly configuracionCaja = inject(ConfiguracionCajaStore);
  protected readonly cajaEndpoint = CAJA_SELECT_ENDPOINT;
  /**
   * Solo las cajas de la sede del usuario (Configuración), igual que allá: la
   * caja tiene que ser de su sede. Sin sede configurada se ofrecen todas.
   */
  protected readonly cajaParams = computed((): Record<string, string> => {
    const sede = this.configuracionCaja.configuracion().sede;
    return sede ? { sede_id: String(sede.id) } : {};
  });
  /** Catálogo de cajas que trajo el select; `null` mientras no llega. */
  private readonly cajas = signal<readonly ErpSelectOption[] | null>(null);
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
      untracked(() => this.sugerirCaja());
    });

    // El catálogo o la configuración del usuario pueden llegar con el modal ya abierto.
    effect(() => this.sugerirCaja());
  }

  protected onCajasCargadas(cajas: readonly ErpSelectOption[]): void {
    this.cajas.set(cajas);
  }

  /**
   * Con el modal abierto y la caja vacía, propone la del usuario; si no está en
   * el catálogo (inactiva o de otra sede) y solo hay una, esa. No pisa lo que la
   * persona eligió.
   *
   * La sugerencia vive aquí y no en el `suggestedMatch` del select: el select se
   * crea con la página (el contenido del `p-dialog` se proyecta) y sugiere una
   * sola vez, al llegar el catálogo. El `reset` de cada apertura la borraba, y
   * si la configuración del usuario llegaba después del catálogo no había
   * sugerencia.
   */
  private sugerirCaja(): void {
    if (!this.visible()) return;
    const cajas = this.cajas();
    const porDefecto = this.configuracionUsuario.caja();
    if (!cajas?.length || untracked(() => this.form.controls.caja.value)) return;
    const opcion =
      cajas.find((c) => c.id === porDefecto?.id) ?? (cajas.length === 1 ? cajas[0] : undefined);
    if (opcion) untracked(() => this.form.controls.caja.setValue(opcion));
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
