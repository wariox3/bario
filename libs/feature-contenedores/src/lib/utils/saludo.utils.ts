/** Parte del día que decide el saludo. */
export type MomentoDia = 'manana' | 'tarde' | 'noche';

/** Mañana de 5 a 11, tarde de 12 a 18 y noche de 19 a 4. */
export function momentoDelDia(fecha: Date): MomentoDia {
  const hora = fecha.getHours();
  if (hora >= 5 && hora < 12) return 'manana';
  if (hora >= 12 && hora < 19) return 'tarde';
  return 'noche';
}

/** El saludo trata a la persona por su primer nombre: "Mario", no "Mario Pérez Gómez". */
export function primerNombre(nombre: string | null | undefined): string {
  return nombre?.trim().split(/\s+/)[0] ?? '';
}

/** "Viernes, 30 de octubre" (o "Friday, October 30"): el día de hoy, sin el año. */
export function fechaConDia(fecha: Date, locale: string): string {
  const texto = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(fecha);
  return texto.charAt(0).toLocaleUpperCase(locale) + texto.slice(1);
}
