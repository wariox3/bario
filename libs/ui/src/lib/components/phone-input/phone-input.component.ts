import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import {
  CELULAR_E164,
  I18nService,
  PAISES_CELULAR,
  PaisCelular,
  banderaEmoji,
  componerCelular,
  partirCelular,
} from '@reddoc/core';
import type { PhoneInputTranslationsHost } from './i18n';

/** Opción del selector: el país del catálogo + lo derivado para pintar y filtrar. */
interface OpcionPais {
  readonly pais: PaisCelular;
  readonly iso: string;
  /** Nombre localizado vía `Intl.DisplayNames` — no hay tabla de nombres que mantener. */
  readonly nombre: string;
  readonly indicativo: string;
  /** `+57`, para que el filtro también encuentre escribiendo con el `+`. */
  readonly indicativoMas: string;
  readonly bandera: string;
}

/**
 * Campo de celular en dos piezas —selector de indicativo + número nacional—
 * que hacia el formulario es **un solo control string en E.164**
 * (`+573153334455`, el formato en que el backend guarda `celular`) o `''`.
 *
 * El form conserva su `Validators.required` y sus mensajes; este componente
 * aporta la validación de formato vía `NG_VALIDATORS`:
 *
 * - `celularE164` — el valor compuesto no cumple E.164.
 * - `celularLongitud` — el número nacional no tiene el largo de un celular del
 *   país elegido (solo cuando el catálogo conoce `longitudes`).
 *
 * Un valor precargado sin `+` (dato legado) se asume del país por defecto; aún
 * así conviene precargar con `normalizarCelular` para que el control nunca
 * guarde un valor fuera de E.164.
 */
@Component({
  selector: 'lib-phone-input',
  standalone: true,
  imports: [FormsModule, SelectModule, InputTextModule],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true,
    },
  ],
})
export class PhoneInputComponent implements ControlValueAccessor, Validator {
  private readonly i18n = inject<I18nService<PhoneInputTranslationsHost>>(I18nService);

  /** `id` del input del número — el `<label for>` del formulario apunta acá. */
  readonly inputId = input<string>('');
  /** Pinta el grupo en error; el form pasa la misma expresión que a sus otros campos. */
  readonly invalid = input<boolean>(false);
  /** País asumido al abrir vacío o al recibir un valor legado sin `+`. */
  readonly defaultIso = input<string>('CO');
  readonly placeholder = input<string>('');

  protected readonly dict = computed(() => this.i18n.t().phoneInput);

  protected readonly pais = signal<PaisCelular>(
    PAISES_CELULAR.find((p) => p.iso === 'CO') ?? PAISES_CELULAR[0],
  );
  protected readonly nacional = signal<string>('');
  protected readonly disabled = signal(false);

  /** Recalculadas al cambiar el idioma: nombre y orden salen del locale activo. */
  protected readonly opciones = computed<OpcionPais[]>(() => {
    const lang = this.i18n.lang();
    const nombres = new Intl.DisplayNames([lang], { type: 'region' });
    const collator = new Intl.Collator(lang);
    return PAISES_CELULAR.map((pais) => ({
      pais,
      iso: pais.iso,
      nombre: nombres.of(pais.iso) ?? pais.iso,
      indicativo: pais.indicativo,
      indicativoMas: `+${pais.indicativo}`,
      bandera: banderaEmoji(pais.iso),
    })).sort((a, b) => collator.compare(a.nombre, b.nombre));
  });

  protected readonly opcionSeleccionada = computed<OpcionPais | null>(
    () => this.opciones().find((o) => o.iso === this.pais().iso) ?? null,
  );

  private onChangeFn: (value: string) => void = () => undefined;
  protected onTouchedFn: () => void = () => undefined;

  writeValue(value: string | null): void {
    const { pais, nacional } = partirCelular(value, this.defaultIso());
    this.pais.set(pais);
    this.nacional.set(nacional);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const valor = typeof control.value === 'string' ? control.value : '';
    if (!valor) return null;
    if (!CELULAR_E164.test(valor)) return { celularE164: true };

    // Solo se mide el largo si el `+` matcheó un país del catálogo: un
    // indicativo desconocido no debe medirse contra los largos del default.
    const { pais, nacional, enCatalogo } = partirCelular(valor, this.defaultIso());
    if (enCatalogo && pais.longitudes && !pais.longitudes.includes(nacional.length)) {
      return { celularLongitud: true };
    }
    return null;
  }

  protected onPaisChange(opcion: OpcionPais | null): void {
    if (!opcion) return;
    this.pais.set(opcion.pais);
    this.emitir();
  }

  /**
   * Deja pasar solo dígitos, reubicando el cursor por conteo de **dígitos**
   * (misma técnica que `SoloDigitosDirective`, que acá no aplica: este input
   * interno no tiene `NgControl`). La ganancia principal es pegar: un número
   * copiado de WhatsApp llega con espacios o guiones y entra limpio.
   */
  protected onNacionalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const original = input.value;
    const soloDigitos = original.replace(/\D/g, '');
    if (original !== soloDigitos) {
      const cursor = input.selectionStart ?? original.length;
      const digitosAntes = original.slice(0, cursor).replace(/\D/g, '').length;
      input.value = soloDigitos;
      input.setSelectionRange(digitosAntes, digitosAntes);
    }
    this.nacional.set(soloDigitos);
    this.emitir();
  }

  private emitir(): void {
    this.onChangeFn(componerCelular(this.pais(), this.nacional()));
  }
}
