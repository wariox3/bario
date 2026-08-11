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
import { extractErrorMessage } from '@reddoc/core';
import { AuthService } from '../../../auth/services/auth.service';
import { MFA_CODIGO_LARGO, MfaMetodoFila, formatSegundos } from '../../models/mfa-metodo.model';
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
  imports: [DialogModule, ButtonModule, InputOtpModule, FormsModule],
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

  readonly largo = MFA_CODIGO_LARGO;

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

  constructor() {
    // Token nuevo (primer envío o reenvío) = código nuevo: lo tecleado ya no sirve.
    effect(() => {
      this.mfaToken();
      this.codigo.set('');
      this.errorMensaje.set(null);
    });
  }

  /** Se completaron las casillas: verificamos sin obligar a apretar el botón. */
  onCodigoChange(valor: string): void {
    this.codigo.set(valor ?? '');
    this.errorMensaje.set(null);
    if ((valor?.length ?? 0) === this.largo) this.verificar();
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
    if (!token || !metodo || this.isVerifying() || this.expirado()) return;
    if (this.codigo().length !== this.largo) return;

    this.isVerifying.set(true);
    this.errorMensaje.set(null);

    this.mfaService
      .activar(token, this.codigo())
      .pipe(
        // El método quedó activo: releemos `/me` para que la card lo refleje, pero
        // conservando la respuesta — los códigos de respaldo vienen ahí y no se repiten.
        switchMap((respuesta) => this.authService.me().pipe(map(() => respuesta))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.isVerifying.set(false);
          this.verificado.emit({
            metodo,
            codigosRespaldo: respuesta.codigos_respaldo ?? [],
          });
        },
        error: (err) => {
          this.isVerifying.set(false);
          // El error se muestra acá adentro, junto al campo: el toast global quedaría
          // detrás del modal y obligaría a mirar a otro lado.
          this.errorMensaje.set(
            extractErrorMessage(err, 'El código no es correcto o ya venció. Inténtalo de nuevo.'),
          );
          this.codigo.set('');
        },
      });
  }
}
