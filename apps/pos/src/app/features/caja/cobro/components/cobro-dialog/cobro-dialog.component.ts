import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  CUENTA_BANCO_ENDPOINT,
  I18nService,
  ToastService,
  asesorLabel,
  extractErrorMessage,
  formatCop,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  ErpApiSelectComponent,
  ErpAsesorSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
} from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../../configuracion/configuracion-caja.store';
import { CarritosStore } from '../../../carrito/carritos.store';
import { CobroService } from '../../cobro.service';
import {
  CatalogoCobroError,
  CobroError,
  type FaseCobro,
  type SolicitudCobro,
} from '../../cobro.model';
import { cambio, sugerenciasEfectivo } from '../../efectivo';
import { MEDIOS_PAGO_POS, type MedioPagoPos } from '../../medios-pago';
import { VentaPosService } from '../../../../../core/documento/venta-pos.service';

type Vista = 'medios' | 'efectivo' | 'exito' | 'pendiente';

/** Venta ya cobrada: lo que la pantalla de éxito necesita aunque el carrito ya no exista. */
interface VentaCobrada {
  readonly documentoId: number;
  readonly total: number;
  readonly cambio: number;
}

/**
 * Cobro de la venta activa, en pasos:
 *
 * 1. **Medio de pago.** Solo efectivo está habilitado; los demás se ven como
 *    "próximamente" (ver `MEDIOS_PAGO_POS`).
 * 2. **Efectivo.** Lo recibido (con montos sugeridos), el cambio, la cuenta y el
 *    asesor. Lo recibido no puede ser menor al total: en caja se paga completo.
 * 3. **Éxito.** El documento quedó aprobado; se puede imprimir o seguir vendiendo.
 *
 * Si el cobro falla después de crear el documento, la venta queda marcada con
 * él y el diálogo abre en **pendiente**: reintentar retoma donde quedó, y
 * descartar borra ese documento sin aprobar.
 */
@Component({
  selector: 'app-cobro-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './cobro-dialog.component.html',
})
export class CobroDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly carritos = inject(CarritosStore);
  private readonly configuracion = inject(ConfiguracionCajaStore);
  private readonly cobroService = inject(CobroService);
  private readonly ventas = inject(VentaPosService);

  protected readonly t = this.i18n.t;

  readonly visible = model(false);
  /** Se cobró una venta: la caja refresca el stock del catálogo. */
  readonly cobrada = output<void>();

  protected readonly medios = MEDIOS_PAGO_POS;
  protected readonly cuentaEndpoint = CUENTA_BANCO_ENDPOINT;

  protected readonly vista = signal<Vista>('medios');
  protected readonly fase = signal<FaseCobro | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ventaCobrada = signal<VentaCobrada | null>(null);
  protected readonly imprimiendo = signal(false);
  protected readonly descartando = signal(false);

  protected readonly procesando = computed(() => this.fase() !== null || this.descartando());
  protected readonly total = computed(() => this.carritos.resumen().total);
  protected readonly cobroPendiente = this.carritos.cobroPendiente;
  protected readonly sugerencias = computed(() => sugerenciasEfectivo(this.total()));

  /** El diálogo ya no existe: un cobro que termina después no emite nada. */
  private destruido = false;

  /** Medio elegido; hoy siempre efectivo, pero la solicitud ya lo lleva. */
  private medio: MedioPagoPos = MEDIOS_PAGO_POS[0];

  protected readonly form = this.fb.group({
    recibido: this.fb.control<number | null>(null, [
      Validators.required,
      (control: AbstractControl): ValidationErrors | null =>
        (control.value ?? 0) < this.total() ? { insuficiente: true } : null,
    ]),
    cuenta: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    asesor: this.fb.control<ErpSelectOption | null>(null),
  });

  private readonly recibido = signal(0);
  protected readonly cambioEfectivo = computed(() => cambio(this.recibido(), this.total()));

  constructor() {
    this.form.controls.recibido.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => this.recibido.set(valor ?? 0));

    this.destroyRef.onDestroy(() => (this.destruido = true));

    // Cada vez que se abre, arranca limpio con los valores de la caja.
    effect(() => {
      if (!this.visible()) return;
      untracked(() => this.preparar());
    });
  }

  protected formatear(valor: number): string {
    return formatCop(valor);
  }

  protected elegirMedio(medio: MedioPagoPos): void {
    if (!medio.habilitado) return;
    this.medio = medio;
    this.vista.set('efectivo');
  }

  protected usarMonto(monto: number): void {
    this.form.controls.recibido.setValue(monto);
  }

  protected onCobrar(): void {
    if (this.procesando() || this.form.invalid) return;
    this.ejecutar();
  }

  protected onReintentar(): void {
    if (this.procesando()) return;
    this.ejecutar();
  }

  protected onDescartar(): void {
    const pendiente = this.cobroPendiente();
    if (!pendiente) return;
    const tx = this.t().caja.cobro.pendiente.descartarConfirm;
    const uuid = this.carritos.activo().uuid;
    this.confirmation.confirm({
      header: tx.header,
      message: tx.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: tx.aceptar,
      rejectLabel: this.t().caja.carrito.cancelar,
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.descartando.set(true);
        this.error.set(null);
        this.ventas
          .eliminar(pendiente.documentoId)
          // Sin atarse al diálogo: si se cierra a mitad, la venta igual se desbloquea.
          .subscribe({
            next: () => {
              this.descartando.set(false);
              this.carritos.limpiarCobro(uuid);
              this.vista.set('medios');
            },
            error: (err: unknown) => {
              this.descartando.set(false);
              this.error.set(extractErrorMessage(err, this.t().caja.cobro.errores.descartar));
            },
          });
      },
    });
  }

  protected onImprimir(): void {
    const venta = this.ventaCobrada();
    if (!venta || this.imprimiendo()) return;
    this.imprimiendo.set(true);
    this.ventas
      .imprimir(venta.documentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.imprimiendo.set(false),
        error: () => {
          this.imprimiendo.set(false);
          const tx = this.t().caja.cobro.errores.imprimir;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  protected cerrar(): void {
    if (this.procesando()) return;
    this.visible.set(false);
  }

  private preparar(): void {
    const config = this.configuracion.configuracion();
    this.fase.set(null);
    this.error.set(null);
    this.ventaCobrada.set(null);
    this.medio = MEDIOS_PAGO_POS[0];
    this.form.reset({
      recibido: this.total(),
      cuenta: config.cuentaEfectivo,
      asesor: config.asesor,
    });
    this.vista.set(this.cobroPendiente() ? 'pendiente' : 'medios');
  }

  private ejecutar(): void {
    const solicitud = this.armarSolicitud();
    if (!solicitud) return;
    const uuid = solicitud.venta.uuid;
    const total = this.total();
    const vuelto = this.cambioEfectivo();
    this.error.set(null);

    this.cobroService
      .cobrar(solicitud)
      // Sin `takeUntilDestroyed` a propósito: si el diálogo se destruye a mitad del
      // cobro (se navega a otra sección, se rota la tablet), cortar el pipeline
      // dejaría un documento creado sin marcar la venta como pendiente, y el
      // siguiente intento duplicaría la factura. El cobro termina igual y sus
      // efectos quedan en `CarritosStore`, que vive en la raíz.
      .subscribe({
        next: (evento) => {
          if (evento.tipo === 'fase') {
            this.fase.set(evento.fase);
            return;
          }
          this.fase.set(null);
          this.ventaCobrada.set({ documentoId: evento.documentoId, total, cambio: vuelto });
          this.carritos.cerrarCobrada(uuid);
          this.vista.set('exito');
          if (!this.destruido) this.cobrada.emit();
        },
        error: (err: unknown) => this.alFallar(err, uuid),
      });
  }

  private alFallar(err: unknown, uuid: string): void {
    this.fase.set(null);
    const errores = this.t().caja.cobro.errores;
    if (!(err instanceof CobroError)) {
      this.error.set(errores.generico);
      return;
    }
    if (err.causa instanceof CatalogoCobroError) {
      this.error.set(errores[err.causa.falta]);
    } else {
      this.error.set(extractErrorMessage(err.causa, errores.generico));
    }
    // El documento ya existe: la venta queda marcada para retomar, no para duplicar.
    if (err.documentoId !== null) {
      this.carritos.registrarCobro(uuid, { documentoId: err.documentoId, pagado: err.pagado });
      this.vista.set('pendiente');
    }
  }

  private armarSolicitud(): SolicitudCobro | null {
    const config = this.configuracion.configuracion();
    const { cuenta, asesor } = this.form.getRawValue();
    const cuentaBanco = cuenta ?? config.cuentaEfectivo;
    if (config.documentoTipoId === null || config.almacen === null || cuentaBanco === null) {
      this.error.set(this.t().caja.cobro.errores.configuracion);
      return null;
    }
    return {
      venta: this.carritos.activo(),
      documentoTipoId: config.documentoTipoId,
      medio: this.medio,
      // En efectivo se registra el total: el cambio se devuelve, no entra a la cuenta.
      pagos: [{ cuentaBanco, monto: this.total() }],
      almacen: config.almacen,
      sede: config.sede,
      asesor: asesor ? { id: asesor.id, nombre: asesorLabel(asesor) } : null,
    };
  }
}
