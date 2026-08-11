import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import {
  APP_BRANDING,
  AUTH_SERVICE,
  ENVIRONMENT,
  I18nService,
  ROUTE_PATHS_TOKEN,
  extractErrorMessage,
  isUnverifiedAccountError,
  SesionNoConfirmadaError,
  crearRelojMfa,
} from '@reddoc/core';
import type { MfaDesafio } from '@reddoc/core';
import { TurnstileComponent } from '../../turnstile/turnstile.component';
import { MfaCodigoInputComponent } from '../../mfa/mfa-codigo-input/mfa-codigo-input.component';
import type { AuthTranslationsHost } from '../i18n';

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    CheckboxModule,
    FormsModule,
    TurnstileComponent,
    MfaCodigoInputComponent,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AUTH_SERVICE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routes = inject(ROUTE_PATHS_TOKEN);
  private readonly turnstile = viewChild(TurnstileComponent);

  protected readonly branding = inject(APP_BRANDING, { optional: true }) ?? {
    appName: 'Plataforma',
    tagline: 'Gestiona tu empresa desde un solo lugar.',
  };
  protected readonly env = inject(ENVIRONMENT);
  protected readonly t = inject<I18nService<AuthTranslationsHost>>(I18nService).t;

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly captchaToken = signal<string | null>(null);

  /**
   * Desafío de segundo factor pendiente. Con esto puesto, la contraseña ya se validó
   * pero todavía no hay sesión: la vista pasa al paso del código.
   */
  readonly desafioMfa = signal<MfaDesafio | null>(null);
  readonly codigoMfa = signal('');
  readonly recordarDispositivo = signal(false);
  readonly mfaError = signal<string | null>(null);
  /** Reenvío en vuelo. Aparte de `isLoading`: no bloquea el campo, solo el botón. */
  readonly reenviando = signal(false);

  /**
   * Acá el reenvío **no renueva** el desafío —el backend no reinicia expiración ni
   * intentos—, así que solo se marca el envío: `marcarDesafio()` una sola vez, al recibir
   * el desafío, y `marcarEnvio()` en cada correo.
   */
  private readonly reloj = crearRelojMfa();

  readonly restanteMfa = this.reloj.restante;
  readonly esperaReenvioMfa = this.reloj.esperaReenvio;
  readonly esTotpMfa = computed(() => this.desafioMfa()?.metodo === 'totp');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();

    this.authService
      .login({
        email: email!,
        password: password!,
        turnstile_token: this.captchaToken()!,
      })
      .subscribe({
        next: (resultado) => {
          this.turnstile()?.reset();

          // Sin cookies todavía: navegar acá mandaría al dashboard sin sesión y el
          // guard rebotaría de vuelta al login, en un bucle sin explicación.
          if (resultado.estado === 'mfa') {
            this.desafioMfa.set(resultado.desafio);
            this.reloj.marcarDesafio();
            this.isLoading.set(false);
            return;
          }

          // `null` = 401 en `/me`: el backend aceptó la contraseña pero no hay sesión
          // (cookies bloqueadas, por ejemplo). Navegar dejaría al guard rebotando acá sin
          // decir nada; y no es "credenciales inválidas", que ya se validaron.
          if (resultado.usuario === null) {
            this.errorMessage.set(this.t().auth.login.mfa.errors.sessionUnconfirmed);
            this.isLoading.set(false);
            return;
          }

          this.router.navigateByUrl(this.returnUrlSeguro());
        },
        error: (err) => {
          this.turnstile()?.reset();
          this.captchaToken.set(null);

          // La contraseña se aceptó; lo que falló fue confirmar la sesión. Decir
          // "credenciales inválidas" mandaría a dudar de una contraseña correcta.
          if (err instanceof SesionNoConfirmadaError) {
            this.errorMessage.set(this.t().auth.login.mfa.errors.sessionUnconfirmed);
            this.isLoading.set(false);
            return;
          }

          if (isUnverifiedAccountError(err)) {
            this.router.navigate([this.routes.auth.resendVerification], {
              queryParams: { email: this.form.getRawValue().email, unverified: true },
            });
            return;
          }

          this.errorMessage.set(
            extractErrorMessage(err, this.t().auth.login.errors.invalidCredentials),
          );
          this.isLoading.set(false);
        },
      });
  }

  /** Paso 2: confirma el código y recién ahí llegan las cookies. */
  confirmarMfa(): void {
    const desafio = this.desafioMfa();
    if (!desafio || this.isLoading()) return;

    const codigo = this.codigoMfa().trim();
    if (!codigo) return;

    this.isLoading.set(true);
    this.mfaError.set(null);

    this.authService
      .loginMfa({
        mfa_token: desafio.mfa_token,
        codigo,
        recordar_dispositivo: this.recordarDispositivo(),
      })
      .subscribe({
        next: (usuario) => {
          // El código se aceptó (si no, esto habría sido un error): `null` es un 401 en
          // `/me`, o sea cookies que no llegaron. Reintentar el código no arregla nada.
          if (usuario === null) {
            this.mfaError.set(this.t().auth.login.mfa.errors.sessionUnconfirmed);
            this.isLoading.set(false);
            return;
          }
          this.reloj.detener();
          this.router.navigateByUrl(this.returnUrlSeguro());
        },
        error: (err) => {
          this.isLoading.set(false);

          // El código se aceptó y las cookies ya están: fue `/me` el que no respondió.
          // Limpiar el campo acá mandaría a reintentar un código ya quemado, que esta
          // vez sí fallaría de verdad. Se deja escrito y se pide recargar.
          if (err instanceof SesionNoConfirmadaError) {
            this.mfaError.set(this.t().auth.login.mfa.errors.sessionUnconfirmed);
            return;
          }

          this.mfaError.set(extractErrorMessage(err, this.t().auth.login.mfa.errors.invalidCode));
          this.codigoMfa.set('');
        },
      });
  }

  /**
   * Otro correo con el MISMO desafío: el backend no reinicia ni la expiración ni los
   * intentos, así que `desafioPedidoEn` no se toca. Lo que sí arranca de cero es la
   * espera entre envíos — sin esto el botón queda habilitado para siempre pasados los
   * primeros 60 s y se puede disparar un correo por clic.
   */
  reenviarMfa(): void {
    const desafio = this.desafioMfa();
    if (!desafio || this.reenviando() || this.esperaReenvioMfa() > 0) return;

    this.reenviando.set(true);
    this.mfaError.set(null);
    this.authService.loginMfaReenviar(desafio.mfa_token).subscribe({
      next: () => {
        this.reenviando.set(false);
        // Solo el envío: la vigencia del desafío sigue donde iba.
        this.reloj.marcarEnvio();
      },
      error: (err) => {
        this.reenviando.set(false);
        this.mfaError.set(extractErrorMessage(err, this.t().auth.login.mfa.errors.invalidCode));
      },
    });
  }

  /** Volver al formulario: el desafío se descarta, no queda a medias. */
  volverAlLogin(): void {
    this.reloj.reiniciar();
    this.desafioMfa.set(null);
    this.codigoMfa.set('');
    this.mfaError.set(null);
    this.reenviando.set(false);
    this.recordarDispositivo.set(false);
    this.form.controls.password.reset();
    // El token del paso 1 ya se gastó: dejarlo puesto habilita el submit con un token
    // muerto hasta que el widget remontado emita el siguiente.
    this.captchaToken.set(null);
  }

  /** `returnUrl` solo si es una ruta interna: evita el redirect abierto. */
  private returnUrlSeguro(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : this.routes.dashboard.root;
  }

  get emailControl() {
    return this.form.controls.email;
  }
  get passwordControl() {
    return this.form.controls.password;
  }
}
