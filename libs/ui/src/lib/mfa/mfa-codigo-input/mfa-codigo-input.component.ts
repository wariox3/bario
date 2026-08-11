import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputOtpModule } from 'primeng/inputotp';
import { InputTextModule } from 'primeng/inputtext';
import {
  I18nService,
  MFA_CODIGO_LARGO,
  MFA_CODIGO_RESPALDO_LARGO,
  formatSegundos,
} from '@reddoc/core';
import type { AuthTranslationsHost } from '../../auth/i18n';

/**
 * Ingreso del código de segundo factor: casillas, reloj de vigencia, reenvío y —donde el
 * backend lo permita— el salto a un código de respaldo.
 *
 * Es **tonto**: no hace HTTP ni sabe para qué se está pidiendo el código. Los relojes se
 * los pasa el padre, que es quien sobrevive a que esta vista se cierre. Lo usan el modal
 * de configuración (apps/cuenta) y el segundo paso del login (libs/ui).
 */
@Component({
  selector: 'lib-mfa-codigo-input',
  standalone: true,
  imports: [InputOtpModule, InputTextModule, FormsModule],
  templateUrl: './mfa-codigo-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaCodigoInputComponent {
  /** Sus textos viven en `auth.mfaCodigo`, que las 6 apps ya proveen. */
  protected readonly t = inject<I18nService<AuthTranslationsHost>>(I18nService).t;

  /** El código tecleado. Two-way: el padre es quien lo manda al backend. */
  readonly codigo = model('');

  /** A dónde se mandó, ya enmascarado. `null` → se dice en genérico. */
  readonly destino = input<string | null>(null);
  /** La app autenticadora genera el código: no lo enviamos ni se puede reenviar. */
  readonly esTotp = input(false);
  /** Segundos de vida que le quedan al código. `0` = vencido. */
  readonly restante = input(0);
  /** Segundos que faltan para poder pedir otro. `0` = ya se puede. */
  readonly esperaReenvio = input(0);
  /** El backend acepta un código de respaldo en esta operación. */
  readonly permiteRespaldo = input(false);
  /**
   * Pedir otro código trae uno **nuevo**, con vigencia nueva.
   *
   * Es cierto al configurar (`configurar/` devuelve otro token) y falso en el login: ahí
   * el reenvío es otro correo con el MISMO desafío, y la expiración no se reinicia. Con
   * `false`, vencido el código el reenvío deja de ofrecerse: mandaría un correo con un
   * código muerto de fábrica.
   */
  readonly reenvioRenueva = input(true);
  /** Hay una petición en vuelo: se bloquea todo. */
  readonly ocupado = input(false);
  /** Error a mostrar junto al campo (el del backend, o el de validación). */
  readonly error = input<string | null>(null);

  /** El código quedó completo según su formato. El padre decide si envía solo. */
  readonly completado = output<string>();
  /** Pidió otro código. */
  readonly reenviar = output<void>();

  readonly largo = MFA_CODIGO_LARGO;
  readonly largoRespaldo = MFA_CODIGO_RESPALDO_LARGO;

  /** Elegido por el usuario cuando ya no tiene acceso a su método. */
  readonly usarRespaldo = model(false);

  readonly expirado = computed(() => this.restante() === 0);
  readonly restanteEtiqueta = computed(() => formatSegundos(this.restante()));
  readonly esperaEtiqueta = computed(() => formatSegundos(this.esperaReenvio()));

  /** El código está completo según el formato que se esté usando. */
  readonly completo = computed(() =>
    this.usarRespaldo()
      ? this.codigo().trim().length === this.largoRespaldo
      : this.codigo().length === this.largo,
  );

  readonly puedeReenviar = computed(
    () =>
      !this.esTotp() &&
      !this.ocupado() &&
      this.esperaReenvio() === 0 &&
      (this.reenvioRenueva() || !this.expirado()),
  );

  /** Cambiar de formato limpia el campo: un código de 6 no es prefijo de uno de 10. */
  alternarRespaldo(): void {
    this.usarRespaldo.update((valor) => !valor);
    this.codigo.set('');
  }

  onOtpChange(valor: string): void {
    this.codigo.set(valor ?? '');
    if (this.completo()) this.completado.emit(this.codigo());
  }

  onRespaldoChange(valor: string): void {
    this.codigo.set((valor ?? '').toUpperCase());
    if (this.completo()) this.completado.emit(this.codigo().trim());
  }

  onReenviar(): void {
    if (this.puedeReenviar()) this.reenviar.emit();
  }
}
