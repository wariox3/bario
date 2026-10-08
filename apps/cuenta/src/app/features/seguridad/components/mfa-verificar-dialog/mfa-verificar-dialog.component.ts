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
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { enmascararCelular, enmascararEmail, extractErrorMessage } from '@reddoc/core';
import { MfaCodigoInputComponent } from '@reddoc/ui';
import { AuthService } from '../../../auth/services/auth.service';
import { MfaIntentoModo, MfaMetodoFila } from '../../models/mfa-metodo.model';
import { MfaService } from '../../services/mfa.service';

@Component({
  selector: 'app-mfa-verificar-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, PasswordModule, FormsModule, MfaCodigoInputComponent],
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
  readonly expirado = computed(() => this.restante() === 0);

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

  readonly esDesactivar = computed(() => this.modo() === 'desactivar');

  /** El código quedó completo: lo avisa el componente compartido. */
  readonly codigoCompleto = signal(false);

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
      this.codigoCompleto.set(false);
      this.errorMensaje.set(null);
    });
  }

  /** El código cambió: se pierde el error anterior y se recalcula si ya está completo. */
  onCodigoChange(valor: string): void {
    this.codigo.set(valor ?? '');
    this.errorMensaje.set(null);
    this.codigoCompleto.set(false);
  }

  /**
   * Se completó el código: confirmamos sin obligar a apretar el botón. Solo si no falta
   * nada más — con la contraseña vacía, auto-enviar sería un error garantizado.
   */
  onCodigoCompletado(valor: string): void {
    this.codigo.set(valor);
    this.codigoCompleto.set(true);
    if (this.puedeConfirmar()) this.verificar();
  }

  onCancel(): void {
    if (this.isVerifying()) return;
    // El componente vive mientras viva la card: sin esto la contraseña queda en memoria
    // y reaparece escrita en la próxima apertura.
    this.password.set('');
    this.visibleChange.emit(false);
  }

  onReenviar(): void {
    const metodo = this.metodo();
    if (!metodo || this.esperaReenvio() > 0 || this.isVerifying()) return;

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
    // Los dos flujos van por separado y tipados: al mezclarlos en un solo observable el
    // tipo colapsaba a `unknown` y un `codigos_respaldo` ausente se volvía `[]` en
    // silencio — códigos perdidos sin que nadie se entere.
    const confirmar$: Observable<readonly string[]> = this.esDesactivar()
      ? // Desactivar no genera códigos de respaldo: los invalida.
        this.mfaService.desactivar(this.password(), token, codigo).pipe(map(() => []))
      : this.mfaService.activar(token, codigo).pipe(map((r) => r.codigos_respaldo ?? []));

    confirmar$
      .pipe(
        // Cambió el estado del MFA: releemos `/me` para que la card lo refleje, pero
        // conservando los códigos — al activar vienen en esa respuesta y no se repiten.
        //
        // Si `/me` falla, se sigue igual: la operación ya se hizo, y perder los códigos
        // por un blip de red sería irreversible. La card se reacomoda al recargar.
        switchMap((codigosRespaldo) =>
          this.authService.me().pipe(
            catchError(() => of(null)),
            map(() => codigosRespaldo),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (codigosRespaldo) => {
          this.isVerifying.set(false);
          this.password.set('');

          // Activar sin códigos es una anomalía del backend, no un caso normal: se avisa
          // en vez de cerrar como si todo hubiera salido bien.
          if (!this.esDesactivar() && codigosRespaldo.length === 0) {
            this.errorMensaje.set(
              'Se activó la verificación, pero no recibimos tus códigos de respaldo. Contacta a soporte.',
            );
            return;
          }

          this.verificado.emit({ metodo, codigosRespaldo });
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
          this.codigoCompleto.set(false);
        },
      });
  }
}
