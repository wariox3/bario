/**
 * Validaciones del periodo de la **programación de nómina**. Funciones puras
 * (salvo el envoltorio `ValidatorFn`), testeadas en `programacion.validators.spec.ts`.
 */
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * `fecha_desde` no puede ser posterior a `fecha_hasta`.
 *
 * Va a nivel de grupo porque compara dos controles. Si falta alguna fecha no
 * opina: de eso se encargan los `required`.
 *
 * (Misma regla que `rangoFechasValido` de la conciliación bancaria. Se repite en
 * vez de compartirse porque son dos features sin relación; si aparece un tercer
 * caso, toca promoverla a `libs/core`.)
 */
export function rangoFechasValido(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const desde = leerFecha(group, 'fecha_desde');
    const hasta = leerFecha(group, 'fecha_hasta');
    if (!desde || !hasta) return null;
    return desde.getTime() > hasta.getTime() ? { rangoFechasInvalido: true } : null;
  };
}

/**
 * El periodo liquidado debe durar **exactamente** los días del periodo del grupo.
 *
 * ⚠️ Ojo con el nombre del ERP anterior: allá se llama `minimumDaysBetweenDates`,
 * pero su comparación es `diffInDays === minDaysRequired - 1` — no es un mínimo,
 * es una igualdad. Se conserva la semántica real (una quincena son 15 días
 * exactos, no "15 o más"), y el nombre dice lo que hace.
 *
 * **Caso especial de febrero**, también del legacy: un mes corto no llega a los
 * 30 días de un periodo mensual, así que el requerido se ajusta.
 *
 * Con `dias <= 0` (sin grupo elegido todavía) no valida: no hay contra qué medir.
 */
export function duracionPeriodoExacta(dias: number): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (dias <= 0) return null;

    const desde = leerFecha(group, 'fecha_desde');
    const hasta = leerFecha(group, 'fecha_hasta');
    if (!desde || !hasta) return null;

    const requeridos = diasRequeridos(desde, dias);
    const duracion = diasEntre(desde, hasta) + 1; // inclusivo: del 1 al 15 son 15 días

    return duracion === requeridos ? null : { duracionPeriodo: { requeridos, duracion } };
  };
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

/** Lee un control como `Date` válido; `null` si está vacío o no es una fecha. */
function leerFecha(group: AbstractControl, nombre: string): Date | null {
  const valor = group.get(nombre)?.value;
  if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) return null;
  return valor;
}
