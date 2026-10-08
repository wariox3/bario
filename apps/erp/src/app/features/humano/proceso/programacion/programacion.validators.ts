/**
 * Validaciones del periodo de la **programación de nómina**. Funciones puras
 * (salvo el envoltorio `ValidatorFn`), testeadas en `programacion.validators.spec.ts`.
 */
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { PAGO_TIPO_ID } from './programacion.model';

/**
 * Tipos de pago que se liquidan por rango libre: solo piden `desde ≤ hasta`.
 * Los demás —la nómina y cualquier tipo que se sume— deben durar lo que el
 * periodo del grupo.
 */
const PAGOS_DE_RANGO_LIBRE: readonly number[] = [
  PAGO_TIPO_ID.PRIMA,
  PAGO_TIPO_ID.CESANTIA,
  PAGO_TIPO_ID.INTERES_CESANTIA,
];

/**
 * ¿El tipo de pago exige que el rango dure exactamente el periodo del grupo?
 *
 * Es una lista de exclusión y no `=== NOMINA`, como en el ERP anterior: un tipo
 * nuevo arranca validado, que es el lado seguro. Sin tipo elegido también
 * valida.
 */
export function exigeDuracionExacta(pagoTipoId: number | null): boolean {
  return pagoTipoId === null || !PAGOS_DE_RANGO_LIBRE.includes(pagoTipoId);
}

/**
 * `fecha_hasta` no puede ser anterior a `fecha_desde`.
 *
 * Va **sobre el control `fecha_hasta`** y lee `fecha_desde` del padre, en vez de
 * colgarse del grupo: así el error es del campo, `<lib-field-error>` lo pinta
 * debajo, el datepicker se marca en rojo y `libFocusInvalid` sabe adónde llevar
 * a la persona. Si cambia `fecha_desde`, quien arma el form revalida este control.
 *
 * Si falta alguna fecha no opina: de eso se encargan los `required`.
 *
 * (Misma regla que `rangoFechasValido` de la conciliación bancaria. Se repite en
 * vez de compartirse porque son dos features sin relación; si aparece un tercer
 * caso, toca promoverla a `libs/core`.)
 */
export function rangoFechasValido(): ValidatorFn {
  return (hasta: AbstractControl): ValidationErrors | null => {
    const rango = leerRango(hasta);
    if (!rango) return null;
    return rango.desde.getTime() > rango.hasta.getTime() ? { rangoFechasInvalido: true } : null;
  };
}

/** Detalle del error de duración: lo que debe durar el rango y lo que dura. */
export interface DuracionPeriodoError {
  readonly requeridos: number;
  readonly duracion: number;
}

/**
 * El periodo liquidado debe durar **exactamente** los días del periodo del grupo.
 * Va sobre `fecha_hasta`, como `rangoFechasValido`.
 *
 * ⚠️ Ojo con el nombre del ERP anterior: allá se llama `minimumDaysBetweenDates`,
 * pero su comparación es `diffInDays === minDaysRequired - 1` — no es un mínimo,
 * es una igualdad. Se conserva la semántica real (una quincena son 15 días
 * exactos, no "15 o más"), y el nombre dice lo que hace.
 *
 * **Caso especial de febrero**, también del legacy: un mes corto no llega a los
 * 30 días de un periodo mensual, así que el requerido se ajusta.
 *
 * No opina con `dias <= 0` (sin grupo elegido todavía: no hay contra qué medir)
 * ni con el rango invertido, que ya reclama `rangoFechasValido`: dos mensajes
 * sobre el mismo campo competirían.
 */
export function duracionPeriodoExacta(dias: number): ValidatorFn {
  return (hasta: AbstractControl): ValidationErrors | null => {
    if (dias <= 0) return null;
    const rango = leerRango(hasta);
    if (!rango || rango.desde.getTime() > rango.hasta.getTime()) return null;

    const requeridos = diasRequeridos(rango.desde, dias);
    const duracion = diasEntre(rango.desde, rango.hasta) + 1; // inclusivo: del 1 al 15 son 15
    if (duracion === requeridos) return null;
    const detalle: DuracionPeriodoError = { requeridos, duracion };
    return { duracionPeriodo: detalle };
  };
}

/**
 * La `fecha_hasta` que cierra el periodo empezando en `desde`: la que haría
 * pasar a `duracionPeriodoExacta`. Es lo que ofrece el botón «Usar …» del error.
 */
export function fechaHastaDelPeriodo(desde: Date, dias: number): Date {
  const requeridos = diasRequeridos(desde, dias);
  return new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + requeridos - 1);
}

/**
 * Días que debe durar el periodo empezando en `desde`, con el ajuste de febrero.
 *
 * Tres casos, en el orden del legacy:
 * 1. El periodo no cabe en el mes (30 días en febrero) → dura lo que el mes.
 * 2. Cabe de sobra (quincena empezando el día 1) → dura los días del periodo.
 * 3. No alcanza a completarse (quincena empezando el 16 de febrero) → dura lo que
 *    queda hasta fin de mes.
 */
export function diasRequeridos(desde: Date, dias: number): number {
  if (!esFebrero(desde)) return dias;

  const ultimoDiaDelMes = new Date(desde.getFullYear(), desde.getMonth() + 1, 0).getDate();
  if (dias > ultimoDiaDelMes) return ultimoDiaDelMes;

  const diasRestantes = ultimoDiaDelMes - desde.getDate();
  return diasRestantes > dias ? dias : diasRestantes + 1;
}

/** Días completos entre dos fechas, inmune a horario de verano (compara en UTC). */
function diasEntre(desde: Date, hasta: Date): number {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const a = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / MS_POR_DIA);
}

function esFebrero(fecha: Date): boolean {
  return fecha.getMonth() === 1;
}

/** Las dos fechas del rango, leídas desde el control `fecha_hasta`; `null` si falta alguna. */
function leerRango(hasta: AbstractControl): { desde: Date; hasta: Date } | null {
  const desde = comoFecha(hasta.parent?.get('fecha_desde')?.value);
  const fin = comoFecha(hasta.value);
  return desde && fin ? { desde, hasta: fin } : null;
}

/** Un valor como `Date` válido; `null` si está vacío o no es una fecha. */
function comoFecha(valor: unknown): Date | null {
  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) return null;
  return valor;
}
