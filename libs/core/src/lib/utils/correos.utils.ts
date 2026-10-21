import { FormControl, Validators } from '@angular/forms';

/** Separador con el que el backend guarda varios correos en un solo campo. */
export const SEPARADOR_CORREOS = ';';

/**
 * Lo que se acepta como separador al **leer**: el `;` oficial, más coma y
 * espacios, para que un dato legado o una lista pegada desde el correo se parta
 * igual.
 */
const SEPARADORES_LECTURA = /[;,\s]+/;

/** Mismo criterio que `Validators.email`, así la lista valida igual que un campo suelto. */
export function esCorreoValido(correo: string): boolean {
  return Validators.email(new FormControl(correo)) === null;
}

/** `'a@x.com; b@x.com'` → `['a@x.com', 'b@x.com']`. Vacío o `null` → `[]`. */
export function partirCorreos(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return valor
    .split(SEPARADORES_LECTURA)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** `['a@x.com', 'b@x.com']` → `'a@x.com;b@x.com'`, el formato que guarda el backend. */
export function unirCorreos(correos: readonly string[]): string {
  return correos.join(SEPARADOR_CORREOS);
}

/** Si la lista ya tiene ese correo, sin distinguir mayúsculas. */
export function incluyeCorreo(correos: readonly string[], correo: string): boolean {
  const buscado = correo.toLowerCase();
  return correos.some((c) => c.toLowerCase() === buscado);
}

/**
 * Suma un correo a una lista guardada como string. Solo entra si es válido y
 * no estaba: nunca pisa ni duplica lo que ya había.
 */
export function agregarCorreo(valor: string | null | undefined, correo: string): string {
  const correos = partirCorreos(valor);
  const limpio = correo.trim();
  if (!esCorreoValido(limpio) || incluyeCorreo(correos, limpio)) return unirCorreos(correos);
  return unirCorreos([...correos, limpio]);
}
