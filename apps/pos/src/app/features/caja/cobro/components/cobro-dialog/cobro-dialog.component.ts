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
import { AutoFocus } from 'primeng/autofocus';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  CUENTA_BANCO_ENDPOINT,
  I18nService,
  ToastService,
  asesorLabel,
  extractErrorMessage,
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
import { MEDIOS_PAGO_POS, type MedioPagoId, type MedioPagoPos } from '../../medios-pago';
import { VentaPosService } from '../../../../../core/documento/venta-pos.service';

const FORMATO_PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type Vista = 'cobro' | 'exito' | 'pendiente';

/** Venta ya cobrada: lo que la pantalla de éxito necesita aunque el carrito ya no exista. */
interface VentaCobrada {
  readonly documentoId: number;
  readonly medio: MedioPagoId;
  readonly total: number;
  readonly recibido: number;
  readonly cambio: number;
}

/** De qué venta y de quién: va en la cabecera para no cobrar la pestaña equivocada. */
interface Encabezado {
  readonly venta: string;
  readonly cliente: string;
  readonly identificacion: string;
}

/**
 * La opción del contacto trae la etiqueta `identificación - nombre` (así la arma
 * el selector); la cabecera las muestra en dos líneas.
 */
function partirContacto(etiqueta: string): { nombre: string; identificacion: string } {
  const corte = etiqueta.indexOf(' - ');
  if (corte < 0) return { nombre: etiqueta, identificacion: '' };
  return { identificacion: etiqueta.slice(0, corte), nombre: etiqueta.slice(corte + 3) };
}

/**
 * Cobro de la venta activa (diseño «A · Base refinada»).
 *
 * - **Cobro.** Total, medio de pago (cuatro tarjetas con atajo F1–F4), lo
 *   recibido con billetes sugeridos y el cambio a entregar o lo que falta.
 *   Cuenta y asesor vienen de la configuración: el pie dice a qué cuenta
 *   ingresa y permite cambiarlo. Enter cobra.
 * - **Transferencia** cobra el total contra la cuenta de transferencia de la
 *   caja; la referencia del comprobante (opcional) va al comentario del
 *   documento, porque el pago no tiene dónde guardarla.
 * - **Crédito y débito** se ven apagados y no se pueden elegir (tampoco con
 *   F3/F4). Su formulario (datáfono y aprobación) ya está para cuando se
 *   habiliten.
 * - **Éxito.** El cambio a entregar y el documento; Enter abre una venta nueva.
 * - **Pendiente.** Si el cobro falla después de crear el documento, la venta
 *   queda marcada con él: reintentar retoma donde quedó, descartar lo borra.
 */
@Component({
  selector: 'app-cobro-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AutoFocus,
    DialogModule,
    InputNumberModule,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  // La cabecera de PrimeNG va oculta (frame del modal recibo), y con ella su
  // cierre por Escape: se cablea aquí, salvo mientras el cobro está en curso.
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown)': 'onTecla($event)',
  },
  templateUrl: './cobro-dialog.component.html',
  styles: [
    `
      /*
        El dialog se teletransporta al body, pero la encapsulacion emulada viaja
        en el atributo del propio elemento: estos estilos lo alcanzan. El frame
        (.pos-cobro-dialog) vive en styles.scss.
      */
      :host {
        display: contents;
      }

      @keyframes lineaIn {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      /* El recibo se escribe solo, como en el acuse del ERP: menos de medio segundo. */
      .linea {
        animation: lineaIn 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @media (prefers-reduced-motion: reduce) {
        .linea {
          animation: none;
        }
      }
    `,
  ],
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

  protected readonly vista = signal<Vista>('cobro');
  protected readonly encabezado = signal<Encabezado | null>(null);
  protected readonly fase = signal<FaseCobro | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly ventaCobrada = signal<VentaCobrada | null>(null);
  protected readonly imprimiendo = signal(false);
  protected readonly descartando = signal(false);

  protected readonly procesando = computed(() => this.fase() !== null || this.descartando());
  protected readonly total = computed(() => this.carritos.resumen().total);
  /**
   * La venta suma $0 (precios en cero): el backend rechaza un pago de $0, así
   * que no se cobra; y si ya quedó un documento, reintentar no puede terminar.
   */
  protected readonly sinValor = computed(() => this.total() <= 0);
  protected readonly cobroPendiente = this.carritos.cobroPendiente;
  protected readonly sugerencias = computed(() => sugerenciasEfectivo(this.total()));

  /** El diálogo ya no existe: un cobro que termina después no emite nada. */
  private destruido = false;

  /** Medio elegido; hoy siempre efectivo, pero la solicitud ya lo lleva. */
  protected readonly medio = signal<MedioPagoPos>(MEDIOS_PAGO_POS[0]);

  protected readonly form = this.fb.group({
    // Lo recibido solo cuenta en efectivo: las demás formas pagan el total exacto.
    recibido: this.fb.control<number | null>(null, [
      (control: AbstractControl): ValidationErrors | null =>
        this.medio().id === 'efectivo' && control.value === null ? { required: true } : null,
      (control: AbstractControl): ValidationErrors | null =>
        this.medio().id === 'efectivo' && (control.value ?? 0) < this.total()
          ? { insuficiente: true }
          : null,
    ]),
    referencia: this.fb.nonNullable.control('', Validators.maxLength(60)),
    cuenta: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    asesor: this.fb.control<ErpSelectOption | null>(null),
  });

  private readonly recibido = signal(0);
  protected readonly cambioEfectivo = computed(() => cambio(this.recibido(), this.total()));
  /** Lo que falta para cubrir el total; 0 cuando lo recibido alcanza. */
  protected readonly faltante = computed(() => Math.max(this.total() - this.recibido(), 0));
  protected readonly recibidoActual = this.recibido.asReadonly();

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

  /** Pesos sin centavos cuando no los hay: en la caja `$ 47.600` se lee mejor que `,00`. */
  protected formatear(valor: number): string {
    return FORMATO_PESOS.format(valor);
  }

  protected readonly chipActivo = 'border-brand-blue bg-[#e8f6ff] text-brand-blue';
  protected readonly chipReposo =
    'border-[#e9edf2] bg-white text-brand-text hover:border-brand-blue hover:text-brand-blue';

  /**
   * Solo se eligen los medios habilitados: los demás se ven apagados.
   * Cada uno trae la cuenta que la caja tiene configurada para él (vacía si no
   * tiene: el selector de cuenta está siempre a la vista para elegirla).
   */
  protected elegirMedio(medio: MedioPagoPos): void {
    if (this.procesando() || !medio.habilitado || medio.id === this.medio().id) return;
    this.medio.set(medio);
    const cuenta = this.cuentaPorMedio(medio.id);
    this.form.controls.cuenta.setValue(cuenta);
    this.form.controls.cuenta.markAsUntouched();
    this.form.controls.recibido.updateValueAndValidity();
    this.error.set(null);
  }

  private cuentaPorMedio(medio: MedioPagoId): ErpSelectOption | null {
    const config = this.configuracion.configuracion();
    if (medio === 'efectivo') return config.cuentaEfectivo;
    if (medio === 'transferencia') return config.cuentaTransferencia;
    return null;
  }

  /** F1–F4 eligen el medio de pago mientras se está cobrando. */
  protected onTecla(event: KeyboardEvent): void {
    if (!this.visible() || this.vista() !== 'cobro') return;
    const indice = ['F1', 'F2', 'F3', 'F4'].indexOf(event.key);
    if (indice < 0 || indice >= this.medios.length) return;
    event.preventDefault();
    this.elegirMedio(this.medios[indice]);
  }

  protected usarMonto(monto: number): void {
    this.form.controls.recibido.setValue(monto);
  }

  protected onCobrar(): void {
    if (this.procesando() || !this.medio().habilitado || this.form.invalid) return;
    if (this.sinValor()) {
      this.error.set(this.t().caja.cobro.errores.sinValor);
      return;
    }
    this.ejecutar();
  }

  protected onReintentar(): void {
    if (this.procesando() || this.sinValor()) return;
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
              this.vista.set('cobro');
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

  protected onEscape(): void {
    // Con la confirmación de descartar encima, Escape es de ella: cierra solo esa.
    if (!this.visible() || document.querySelector('.p-confirmdialog')) return;
    this.cerrar();
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
    this.medio.set(MEDIOS_PAGO_POS[0]);
    const venta = this.carritos.activo();
    const contacto = partirContacto(venta.contacto?.nombre ?? '');
    this.encabezado.set({
      venta: venta.nombre,
      cliente: contacto.nombre,
      identificacion: contacto.identificacion,
    });
    this.form.reset({
      recibido: this.total(),
      cuenta: config.cuentaEfectivo,
      asesor: config.asesor,
      referencia: '',
    });
    this.vista.set(this.cobroPendiente() ? 'pendiente' : 'cobro');
  }

  private ejecutar(): void {
    const solicitud = this.armarSolicitud();
    if (!solicitud) return;
    const uuid = solicitud.venta.uuid;
    const total = this.total();
    const efectivo = solicitud.medio.id === 'efectivo';
    // Fuera del efectivo se paga el total exacto: no hay recibido de más ni cambio.
    const recibido = efectivo ? this.recibido() : total;
    const vuelto = efectivo ? this.cambioEfectivo() : 0;
    const medio = solicitud.medio.id;
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
          this.ventaCobrada.set({
            documentoId: evento.documentoId,
            medio,
            total,
            recibido,
            cambio: vuelto,
          });
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
    const { cuenta, asesor, referencia } = this.form.getRawValue();
    const medio = this.medio();
    const tx = this.t().caja.cobro;
    const cuentaBanco = cuenta ?? this.cuentaPorMedio(medio.id);
    if (config.documentoTipoId === null || config.almacen === null || cuentaBanco === null) {
      this.error.set(
        medio.id === 'transferencia' && cuentaBanco === null
          ? tx.errores.cuentaTransferencia
          : tx.errores.configuracion,
      );
      return null;
    }
    const ref = referencia.trim();
    return {
      venta: this.carritos.activo(),
      documentoTipoId: config.documentoTipoId,
      medio,
      // En efectivo se registra el total: el cambio se devuelve, no entra a la cuenta.
      pagos: [{ cuentaBanco, monto: this.total() }],
      almacen: config.almacen,
      sede: config.sede,
      asesor: asesor ? { id: asesor.id, nombre: asesorLabel(asesor) } : null,
      comentario:
        medio.id === 'transferencia' && ref ? `${tx.transferencia.comentario} ${ref}` : null,
    };
  }
}
