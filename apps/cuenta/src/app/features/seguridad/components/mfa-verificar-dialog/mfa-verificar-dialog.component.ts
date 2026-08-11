import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputOtpModule } from 'primeng/inputotp';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { extractErrorMessage } from '@reddoc/core';
import { AuthService } from '../../../auth/services/auth.service';
import {
  MFA_CODIGO_LARGO,
  MFA_CODIGO_RESPALDO_LARGO,
  MfaActivarResponse,
  MfaIntentoModo,
  MfaMetodoFila,
  formatSegundos,
} from '../../models/mfa-metodo.model';
import { MfaService } from '../../services/mfa.service';

/** `sebastian.h.piedrahita@gmail.com` → `s•••@gmail.com`. */
function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return email;
  return `${usuario.slice(0, 1)}•••@${dominio}`;
}

/** `3001234821` → `••• ••• 4821`. */
function enmascararCelular(celular: string): string {
  const digitos = celular.replace(/\D/g, '');
  return digitos.length < 4 ? '•••' : `••• ••• ${digitos.slice(-4)}`;
}

@Component({
  selector: 'app-mfa-verificar-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    InputOtpModule,
    InputTextModule,
    PasswordModule,
    FormsModule,
  ],
  templateUrl: './mfa-verificar-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaVerificarDialogComponent {
  private readonly mfaService = inject(MfaService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input(false);
  /** Método que se está activando. */
  readonly metodo = input<MfaMetodoFila | null>(null);
  /** Token del intento en curso. Cambiarlo (reenvío) limpia lo tecleado. */
  readonly mfaToken = input<string | null>(null);
  /** Activar o desactivar: mismo modal, distinto endpoint de confirmación. */
  readonly modo = input<MfaIntentoModo>('activar');
  /**
   * Los dos relojes los lleva la card, no el modal: así siguen corriendo aunque el
   * usuario cierre esta ventana, que es justo lo que evita el reenvío en bucle.
   */
  readonly restante = input(0);
  readonly esperaReenvio = input(0);

  readonly visibleChange = output<boolean>();
  /**
   * El código se confirmó: el método quedó activo. Viajan los códigos de respaldo,
   * que el backend entrega una única vez y hay que mostrarle al usuario sí o sí.
   */
  readonly verificado = output<{
    readonly metodo: MfaMetodoFila;
    readonly codigosRespaldo: readonly string[];
  }>();
  /** Se pidió otro código; la card vuelve a llamar a `configurar` y renueva el token. */
  readonly reenviar = output<MfaMetodoFila>();

  readonly codigo = signal('');
  readonly isVerifying = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  /** Solo al desactivar: el backend exige la contraseña además del código. */
  readonly password = signal('');
  /** Solo al desactivar: el backend acepta un código de respaldo en lugar del de 6 dígitos. */
  readonly usarRespaldo = signal(false);

  readonly largo = MFA_CODIGO_LARGO;
  readonly largoRespaldo = MFA_CODIGO_RESPALDO_LARGO;

  readonly expirado = computed(() => this.restante() === 0);
  readonly restanteEtiqueta = computed(() => formatSegundos(this.restante()));
  readonly esperaEtiqueta = computed(() => formatSegundos(this.esperaReenvio()));

  /** El código de la app autenticadora no lo enviamos nosotros: no hay destino ni reenvío. */
  readonly esTotp = computed(() => this.metodo()?.codigo === 'totp');

  /** A dónde le llegó el código, enmascarado. `null` para totp. */
  readonly destino = computed(() => {
    const usuario = this.authService.currentUser();
    if (!usuario || this.esTotp()) return null;

    if (this.metodo()?.codigo === 'sms') {
      return usuario.celular ? enmascararCelular(usuario.celular) : null;
    }
    return usuario.email ? enmascararEmail(usuario.email) : null;
  });

  readonly puedeReenviar = computed(
    () => !this.esTotp() && !this.isVerifying() && this.esperaReenvio() === 0,
  );

  readonly esDesactivar = computed(() => this.modo() === 'desactivar');

  /** El código está completo según el formato que se esté usando. */
  readonly codigoCompleto = computed(() =>
    this.usarRespaldo()
      ? this.codigo().trim().length === this.largoRespaldo
      : this.codigo().length === this.largo,
  );

  /** Todo lo que el endpoint necesita está puesto. */
  readonly puedeConfirmar = computed(
    () =>
      this.codigoCompleto() &&
      !this.isVerifying() &&
      !this.expirado() &&
      (!this.esDesactivar() || this.password().trim().length > 0),
  );

  constructor() {
    // Token nuevo (primer envío o reenvío) = código nuevo: lo tecleado ya no sirve.
    // La contraseña NO se limpia: no cambió y volver a escribirla sería castigo gratuito.
    effect(() => {
      this.mfaToken();
      this.codigo.set('');
      this.errorMensaje.set(null);
    });
  }

  /** Cambiar de formato limpia el campo: un código de 6 no es prefijo de uno de 10. */
  alternarRespaldo(): void {
    this.usarRespaldo.update((valor) => !valor);
    this.codigo.set('');
    this.errorMensaje.set(null);
  }

  onRespaldoChange(valor: string): void {
    this.codigo.set((valor ?? '').toUpperCase());
    this.errorMensaje.set(null);
  }

  /**
   * Se completaron las casillas: confirmamos sin obligar a apretar el botón. Solo si no
   * falta nada más — con la contraseña vacía, auto-enviar sería un error garantizado.
   */
  onCodigoChange(valor: string): void {
    this.codigo.set(valor ?? '');
    this.errorMensaje.set(null);
    if (this.puedeConfirmar()) this.verificar();
  }

  onCancel(): void {
    if (this.isVerifying()) return;
    this.visibleChange.emit(false);
  }

  onReenviar(): void {
    const metodo = this.metodo();
    if (!metodo || !this.puedeReenviar()) return;

    this.errorMensaje.set(null);
    this.reenviar.emit(metodo);
  }

  verificar(): void {
    const token = this.mfaToken();
    const metodo = this.metodo();
    if (!token || !metodo || !this.puedeConfirmar()) return;

    this.isVerifying.set(true);
    this.errorMensaje.set(null);

    const codigo = this.codigo().trim();
    const confirmar$ = this.esDesactivar()
      ? this.mfaService.desactivar(this.password(), token, codigo)
      : this.mfaService.activar(token, codigo);

    confirmar$
      .pipe(
        // Cambió el estado del MFA: releemos `/me` para que la card lo refleje, pero
        // conservando la respuesta — al activar, los códigos de respaldo vienen ahí
        // y no se repiten.
        switchMap((respuesta) => this.authService.me().pipe(map(() => respuesta))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.isVerifying.set(false);
          this.verificado.emit({
            metodo,
            // Desactivar no genera códigos de respaldo: los invalida.
            codigosRespaldo: this.esDesactivar()
              ? []
              : ((respuesta as MfaActivarResponse)?.codigos_respaldo ?? []),
          });
        },
        error: (err) => {
          this.isVerifying.set(false);
          // El error se muestra acá adentro, junto al campo: el toast global quedaría
          // detrás del modal y obligaría a mirar a otro lado.
          this.errorMensaje.set(
            extractErrorMessage(err, 'El código no es correcto o ya venció. Inténtalo de nuevo.'),
          );
          // Se limpia el código, no la contraseña: casi siempre el que falla es el código.
          this.codigo.set('');
        },
      });
  }
}
