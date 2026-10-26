import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import { ChipModule } from 'primeng/chip';
import { esCorreoValido, incluyeCorreo, partirCorreos, unirCorreos } from '@reddoc/core';

/** Teclas que confirman lo escrito como un correo más, además de salir del campo. */
const TECLAS_CONFIRMAR: ReadonlySet<string> = new Set(['Enter', ',', ';']);

/**
 * Campo de **varios correos** que se van sumando como badges, al estilo del
 * `p-multiselect` con `display="chip"`. Hacia el formulario es **un solo
 * control string** con los correos unidos por `;` (`a@x.com;b@x.com`), el
 * formato en que el backend los guarda, o `''`.
 *
 * - Un correo se confirma con Enter, `,`, `;` o al salir del campo. Pegar una
 *   lista la parte entera.
 * - Lo que no es un correo válido **no se agrega**: queda escrito en el input y
 *   el control reporta `email`, así `lib-field-error` muestra el mismo mensaje
 *   que un campo de correo suelto.
 * - Un correo inválido que ya venía guardado se pinta en rojo y también reporta
 *   `email`, para que se pueda quitar en vez de quedar oculto.
 * - Backspace con el input vacío quita el último badge.
 *
 * No trae textos propios: el form le pasa el `placeholder`, y la etiqueta
 * accesible del botón que quita un badge sale del translation global de PrimeNG.
 */
@Component({
  selector: 'lib-email-chips-input',
  standalone: true,
  imports: [ChipModule],
  templateUrl: './email-chips-input.component.html',
  styleUrl: './email-chips-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EmailChipsInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => EmailChipsInputComponent),
      multi: true,
    },
  ],
})
export class EmailChipsInputComponent implements ControlValueAccessor, Validator {
  /** `id` del input de texto — el `<label for>` del formulario apunta acá. */
  readonly inputId = input<string>('');
  /** Pinta el campo en error; el form pasa la misma expresión que a sus otros campos. */
  readonly invalid = input<boolean>(false);
  /** Solo se muestra mientras no hay ningún correo. */
  readonly placeholder = input<string>('');

  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');

  protected readonly correos = signal<readonly string[]>([]);
  protected readonly borrador = signal('');
  /** Lo escrito se intentó confirmar y no era un correo: el error se muestra hasta que se edite. */
  private readonly borradorRechazado = signal(false);
  protected readonly disabled = signal(false);

  protected readonly placeholderVisible = computed(() =>
    this.correos().length > 0 ? '' : this.placeholder(),
  );

  private onChangeFn: (value: string) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  private onValidatorChangeFn: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.correos.set(partirCorreos(value));
    this.borrador.set('');
    this.borradorRechazado.set(false);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChangeFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  validate(): ValidationErrors | null {
    if (this.borradorRechazado()) return { email: true };
    if (this.correos().some((c) => !esCorreoValido(c))) return { email: true };
    return null;
  }

  protected esValido(correo: string): boolean {
    return esCorreoValido(correo);
  }

  /** Un clic en el área libre del campo lleva el foco al input, como en un input normal. */
  protected enfocar(): void {
    if (!this.disabled()) this.campo().nativeElement.focus();
  }

  protected onInput(event: Event): void {
    this.borrador.set((event.target as HTMLInputElement).value);
    if (this.borradorRechazado()) {
      this.borradorRechazado.set(false);
      this.onValidatorChangeFn();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (TECLAS_CONFIRMAR.has(event.key)) {
      // Con el input vacío, Enter sigue su curso (enviar el form); con texto,
      // solo confirma el correo.
      if (event.key === 'Enter' && !this.borrador().trim()) return;
      event.preventDefault();
      this.confirmar();
      return;
    }
    if (event.key === 'Backspace' && !this.borrador() && this.correos().length > 0) {
      event.preventDefault();
      this.quitar(this.correos()[this.correos().length - 1]);
    }
  }

  /** Una lista pegada (`a@x.com; b@x.com`) entra de una vez, cada uno como su badge. */
  protected onPaste(event: ClipboardEvent): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    if (partirCorreos(texto).length < 2) return;
    event.preventDefault();
    this.borrador.set(`${this.borrador()} ${texto}`);
    this.confirmar();
  }

  protected onBlur(): void {
    this.confirmar();
    this.onTouchedFn();
  }

  protected quitar(correo: string): void {
    this.correos.set(this.correos().filter((c) => c !== correo));
    this.emitir();
  }

  /**
   * Pasa a badges lo escrito que sea un correo válido y nuevo; lo inválido
   * queda en el input, marcado. Un repetido se descarta en silencio: ya está.
   */
  private confirmar(): void {
    const partes = partirCorreos(this.borrador());
    if (partes.length === 0) {
      this.limpiarBorrador('');
      return;
    }

    const correos = [...this.correos()];
    const rechazados: string[] = [];
    for (const parte of partes) {
      if (!esCorreoValido(parte)) rechazados.push(parte);
      else if (!incluyeCorreo(correos, parte)) correos.push(parte);
    }

    const cambio = correos.length !== this.correos().length;
    this.correos.set(correos);
    this.limpiarBorrador(rechazados.join(' '));
    if (rechazados.length > 0) {
      this.borradorRechazado.set(true);
      this.onTouchedFn();
    }
    if (cambio) this.emitir();
    this.onValidatorChangeFn();
  }

  private limpiarBorrador(texto: string): void {
    this.borrador.set(texto);
    this.campo().nativeElement.value = texto;
  }

  private emitir(): void {
    this.onChangeFn(unirCorreos(this.correos()));
  }
}
