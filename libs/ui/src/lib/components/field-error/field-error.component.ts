import { Component, effect, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { clearServerError } from '@reddoc/core';

/** Lee `requiredLength` de un error de `minlength`/`maxlength`. */
function requiredLength(error: unknown): number {
  if (error !== null && typeof error === 'object' && 'requiredLength' in error) {
    const value = (error as { requiredLength: unknown }).requiredLength;
    if (typeof value === 'number') return value;
  }
  return 0;
}

/** Mensaje por defecto en español para los validadores estándar de Angular. */
function defaultMessage(key: string, error: unknown): string | null {
  switch (key) {
    case 'required':
      return 'Este campo es obligatorio.';
    case 'email':
      return 'El correo no es válido.';
    case 'minlength':
      return `Mínimo ${requiredLength(error)} caracteres.`;
    case 'maxlength':
      return `Máximo ${requiredLength(error)} caracteres.`;
    case 'pattern':
      return 'El formato no es válido.';
    default:
      return null;
  }
}

/**
 * Muestra el error de validación de un `FormControl` debajo del campo.
 *
 * - Aparece cuando el control es inválido y fue tocado o editado.
 * - Prioriza el error `serverError` (mensaje que viene del backend).
 * - Para los validadores estándar usa mensajes por defecto; se pueden sobreescribir o
 *   ampliar con `[messages]` (por ejemplo, para i18n o texto a medida).
 * - Limpia el `serverError` automáticamente cuando el usuario edita el campo.
 */
@Component({
  selector: 'lib-field-error',
  standalone: true,
  host: { '[style.display]': "errorMessage() ? null : 'none'" },
  template: `
    @if (errorMessage(); as message) {
      <span class="mt-1 text-[0.7rem] tracking-[0.01em] text-red-600">{{ message }}</span>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input.required<AbstractControl>();
  /** Mapa { claveError: mensaje } para sobreescribir los textos por defecto. */
  readonly messages = input<Record<string, string>>({});

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const sub = control.valueChanges.subscribe(() => clearServerError(control));
      onCleanup(() => sub.unsubscribe());
    });
  }

  errorMessage(): string | null {
    const control = this.control();
    if (control.valid || (!control.touched && !control.dirty) || !control.errors) {
      return null;
    }

    const errors = control.errors;
    const overrides = this.messages();

    const serverError = errors['serverError'];
    if (typeof serverError === 'string') return serverError;

    for (const key of Object.keys(errors)) {
      if (key === 'serverError') continue;
      if (overrides[key]) return overrides[key];
      const fallback = defaultMessage(key, errors[key]);
      if (fallback) return fallback;
    }
    return null;
  }
}
