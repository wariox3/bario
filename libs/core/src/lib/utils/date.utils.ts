/** Fecha de hoy con la hora puesta a medianoche (00:00:00.000) en zona local. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formatea un `Date` a `yyyy-MM-dd` usando las partes **locales** de la fecha.
 * Evita el corrimiento de día que produciría `toISOString()` (que pasa a UTC).
 */
export function toIsoDate(date: Date): string;
export function toIsoDate(date: Date | null | undefined): string | null;
export function toIsoDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parsea `yyyy-MM-dd` a un `Date` local (sin corrimiento de zona horaria). */
export function fromIsoDate(value: string): Date;
export function fromIsoDate(value: string | null | undefined): Date | null;
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** Formatea la hora de un `Date` a `HH:mm`. */
export function toHora(date: Date): string;
export function toHora(date: Date | null | undefined): string | null;
export function toHora(date: Date | null | undefined): string | null {
  if (!date) return null;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Parsea `HH:mm` a un `Date` (la fecha base es irrelevante: solo importa la hora). */
export function fromHora(value: string): Date;
export function fromHora(value: string | null | undefined): Date | null;
export function fromHora(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Días enteros entre dos fechas (`b - a`), redondeado. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Nueva fecha desplazada `days` días (±), preservando la hora local (sin corrimiento UTC). */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** `HH:mm:ss` → `HH:mm`; `null` si el valor no viene o es más corto que `HH:mm`. */
function horaCorta(hora: string | null): string | null {
  return hora && hora.length >= 5 ? hora.slice(0, 5) : null;
}

/**
 * Franja horaria `desde`–`hasta` (ambas `HH:mm:ss`) formateada como `HH:mm - HH:mm`,
 * o `null` si falta algún extremo.
 */
export function formatHorario(desde: string | null, hasta: string | null): string | null {
  const d = horaCorta(desde);
  const h = horaCorta(hasta);
  return d && h ? `${d} - ${h}` : null;
}

/**
 * Duración en segundos como reloj: `152` → `2:32`. El minuto adelante para que se lea
 * como cuenta regresiva.
 */
export function formatSegundos(total: number): string {
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

const SEGUNDOS_MINUTO = 60;
const SEGUNDOS_HORA = 60 * SEGUNDOS_MINUTO;
const SEGUNDOS_DIA = 24 * SEGUNDOS_HORA;

const HORA_CORTA_ES = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });
const FECHA_CORTA_ES = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

/**
 * Distancia hasta un instante pasado, en castellano: `hace un momento`, `hace 5 minutos`,
 * `hace 3 horas`, `ayer, 12:03`, `8 ago, 09:41`.
 *
 * La escala se abre con la distancia: lo de hoy se mide en minutos y horas —que es como uno
 * recuerda lo que hizo— y de ayer para atrás pesa más la fecha que el "hace". Es una
 * etiqueta cómoda, no precisa: si el momento exacto importa, va aparte (un `title`).
 *
 * `ahora` se recibe en vez de leer el reloj adentro para que sea pura y testeable.
 */
export function formatRecencia(fecha: Date, ahora: number): string {
  const segundos = Math.max(0, Math.floor((ahora - fecha.getTime()) / 1000));

  if (segundos < SEGUNDOS_MINUTO) return 'hace un momento';
  if (segundos < SEGUNDOS_HORA) {
    const minutos = Math.floor(segundos / SEGUNDOS_MINUTO);
    return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  }
  if (segundos < SEGUNDOS_DIA) {
    const horas = Math.floor(segundos / SEGUNDOS_HORA);
    return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  }
  if (segundos < 2 * SEGUNDOS_DIA) return `ayer, ${HORA_CORTA_ES.format(fecha)}`;
  return `${FECHA_CORTA_ES.format(fecha)}, ${HORA_CORTA_ES.format(fecha)}`;
}

/** Año y mes (1-based) extraídos de una fecha ISO `yyyy-MM-dd`. */
export interface AnioMes {
  readonly anio: number;
  readonly mes: number;
}

/**
 * Extrae `{ anio, mes }` (mes 1-based) de una fecha ISO `yyyy-MM-dd`, sin pasar
 * por `Date` (evita corrimientos de zona). Retorna `null` si el string es vacío
 * o no tiene año/mes válidos.
 */
export function anioMesDeIso(iso: string | null | undefined): AnioMes | null {
  if (!iso) return null;
  const anio = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  if (!Number.isFinite(anio) || !Number.isFinite(mes) || mes < 1 || mes > 12) return null;
  return { anio, mes };
}

/**
 * Inicial del día de la semana en español, indexada por `Date.getDay()`
 * (0 = domingo … 6 = sábado). Miércoles usa `X` para no chocar con Martes (`M`).
 */
export const INICIALES_DIA_SEMANA_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

/** Día de un mes: su número y la inicial del día de la semana que le corresponde. */
export interface DiaDelMes {
  /** Número de día (1..N). */
  readonly dia: number;
  /** Inicial del día de la semana en español (`L M X J V S D`). */
  readonly inicial: string;
  /** `true` si cae sábado o domingo. */
  readonly finDeSemana: boolean;
}

/**
 * Días de un mes (`1..N`, según corresponda 28/29/30/31) con la inicial del día
 * de la semana de cada fecha. `mes` es **1-based** (1 = enero).
 *
 * Ej. junio 2026 → `[{ dia: 1, inicial: 'L', finDeSemana: false }, … ]`.
 */
export function diasDelMes(anio: number, mes: number): DiaDelMes[] {
  // `new Date(anio, mes, 0)` con `mes` 1-based es el último día de ese mes.
  const totalDias = new Date(anio, mes, 0).getDate();
  return Array.from({ length: totalDias }, (_, i) => {
    const dia = i + 1;
    const diaSemana = new Date(anio, mes - 1, dia).getDay();
    return {
      dia,
      inicial: INICIALES_DIA_SEMANA_ES[diaSemana],
      finDeSemana: diaSemana === 0 || diaSemana === 6,
    };
  });
}
