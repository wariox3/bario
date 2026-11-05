import {
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { map, startWith } from 'rxjs';
import { FormErrorService, I18nService, ToastService } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { type Cuadre, cuadreDe, formatDiferencia, formatPesos } from '../../turno.format';
import type { Turno, TurnoConDetalles, TurnoResumenCuenta } from '../../turno.model';
import { TurnoService } from '../../turno.service';

type Estado = 'cargando' | 'listo' | 'error';

const COMENTARIO_MAX = 500;

/** Redondeo a centavos: los decimales llegan como string y se suman en float. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Cerrar turno: el arqueo. Por cada cuenta con algo esperado, el cajero escribe
 * lo que contó y ve la diferencia al momento; abajo, el veredicto (cuadra,
 * falta o sobra) y un comentario para explicarla.
 *
 * Lo esperado se pide de nuevo al abrir el diálogo (`resumen/`): entre que se
 * cargó la página y se cierra el turno pudo haber más ventas. El contado
 * arranca vacío a propósito: si arrancara en lo esperado, cerrar sin contar
 * daría siempre "cuadra".
 */
@Component({
  selector: 'app-cerrar-turno-dialog',
  standalone: true,
  host: { class: 'contents' },
  imports: [
    ReactiveFormsModule,
    FocusInvalidDirective,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    TextareaModule,
    FieldErrorComponent,
  ],
  templateUrl: './cerrar-turno-dialog.component.html',
})
export class CerrarTurnoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TurnoService);
  private readonly formErrors = inject(FormErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly comentarioMax = COMENTARIO_MAX;

  readonly visible = input(false);
  readonly turno = input.required<Turno>();
  readonly visibleChange = output<boolean>();
  readonly cerrado = output<TurnoConDetalles>();

  /** El form vive dentro del `@switch`: el pie del diálogo lo envía por referencia. */
  private readonly formulario = viewChild<ElementRef<HTMLFormElement>>('formulario');

  protected readonly titulo = computed(() =>
    this.t().turno.cerrar.title.replace('{id}', String(this.turno().id)),
  );
  protected readonly estado = signal<Estado>('cargando');
  protected readonly guardando = signal(false);
  protected readonly cuentas = signal<readonly TurnoResumenCuenta[]>([]);

  protected readonly form = this.fb.group({
    contados: this.fb.array<FormControl<number | null>>([]),
    comentario: this.fb.control<string>('', Validators.maxLength(COMENTARIO_MAX)),
  });

  private readonly contados = toSignal(
    this.form.controls.contados.valueChanges.pipe(
      startWith(this.form.controls.contados.value),
      map((v) => [...v]),
    ),
    { initialValue: [] as (number | null)[] },
  );

  /** Una fila por cuenta, con su diferencia solo cuando ya se escribió el contado. */
  protected readonly filas = computed(() => {
    const contados = this.contados();
    return this.cuentas().map((c, i) => {
      const contado = contados[i] ?? null;
      const diferencia = contado === null ? null : centavos(contado - Number(c.esperado));
      return {
        id: c.cuenta_banco,
        nombre: c.cuenta_banco_nombre,
        esperado: formatPesos(c.esperado),
        diferencia: diferencia === null ? '' : formatDiferencia(diferencia),
        cuadre: diferencia === null ? null : cuadreDe(diferencia),
      };
    });
  });

  protected readonly totalEsperado = computed(() =>
    centavos(this.cuentas().reduce((s, c) => s + Number(c.esperado), 0)),
  );
  protected readonly todoContado = computed(
    () => this.cuentas().length > 0 && this.contados().every((v) => v !== null),
  );
  protected readonly totalContado = computed(() =>
    centavos(this.contados().reduce<number>((s, v) => s + (v ?? 0), 0)),
  );
  protected readonly faltante = computed(() =>
    centavos(this.filas().reduce((s, _, i) => s + Math.max(0, -this.diferenciaDe(i)), 0)),
  );
  protected readonly sobrante = computed(() =>
    centavos(this.filas().reduce((s, _, i) => s + Math.max(0, this.diferenciaDe(i)), 0)),
  );
  /** El veredicto solo se da con todo contado: a medio contar siempre "faltaría". */
  protected readonly veredicto = computed<Cuadre | null>(() => {
    if (!this.todoContado()) return null;
    if (this.faltante() > 0) return 'falta';
    return this.sobrante() > 0 ? 'sobra' : 'cuadra';
  });
  protected readonly textoVeredicto = computed(() => {
    const tx = this.t().turno.cerrar.veredicto;
    switch (this.veredicto()) {
      case 'cuadra':
        return tx.cuadra;
      case 'falta':
        return tx.falta.replace('{monto}', formatPesos(this.faltante()));
      case 'sobra':
        return tx.sobra.replace('{monto}', formatPesos(this.sobrante()));
      default:
        return '';
    }
  });

  protected readonly fmt = {
    pesos: formatPesos,
    diferencia: formatDiferencia,
  };

  constructor() {
    effect(() => {
      if (this.visible()) this.cargar();
    });
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.service
      .resumen(this.turno().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resumen) => {
          this.cuentas.set(resumen.cuentas);
          const arr = this.form.controls.contados;
          arr.clear({ emitEvent: false });
          resumen.cuentas.forEach(() =>
            arr.push(
              this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
              {
                emitEvent: false,
              },
            ),
          );
          this.form.controls.comentario.reset('');
          arr.updateValueAndValidity();
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }

  protected contadoControl(i: number): FormControl<number | null> {
    return this.form.controls.contados.at(i);
  }

  protected enviar(): void {
    this.formulario()?.nativeElement.requestSubmit();
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.guardando() || this.estado() !== 'listo') return;
    const { contados, comentario } = this.form.getRawValue();
    this.guardando.set(true);
    this.service
      .cerrar({
        id: this.turno().id,
        contados: this.cuentas().map((c, i) => ({
          cuenta_banco: c.cuenta_banco,
          valor: contados[i] ?? 0,
        })),
        comentario: comentario?.trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.guardando.set(false);
          const tx = this.t().turno.cerrar.toasts.exito;
          this.toast.success(tx.title, tx.desc);
          // Primero se cierra el diálogo: al recibir el turno cerrado, la página lo desmonta.
          this.visibleChange.emit(false);
          this.cerrado.emit(turno);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.formErrors.handle(this.form, err, this.t().turno.cerrar.toasts.error.title);
        },
      });
  }

  private diferenciaDe(i: number): number {
    const contado = this.contados()[i];
    const cuenta = this.cuentas()[i];
    return contado == null || !cuenta ? 0 : centavos(contado - Number(cuenta.esperado));
  }
}
