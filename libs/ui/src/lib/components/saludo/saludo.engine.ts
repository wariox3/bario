import {
  FRASES_GENERALES,
  FRASES_POR_DIA,
  FRASES_POR_FRANJA,
  SALUDOS_POR_FRANJA,
  type DiaConFrases,
  type FraseId,
  type FranjaDia,
  type SaludoId,
} from './saludo.catalogo';

/**
 * Peso de cada grupo al sortear la frase. El día de la semana, cuando aplica,
 * pesa bastante pero no siempre gana: un viernes no puede repetir todo el día
 * la misma idea.
 */
const PESO = { dia: 0.35, franja: 0.45, general: 0.2 } as const;

/** Probabilidad de que salga el saludo clásico de la franja (el primero). */
const PROBABILIDAD_CLASICO = 0.5;

/** Madrugada de 0 a 4, temprano de 5 a 7, mañana de 8 a 11, mediodía de 12 a 13, tarde de 14 a 18 y noche de 19 a 23. */
export function franjaDelDia(fecha: Date): FranjaDia {
  const hora = fecha.getHours();
  if (hora < 5) return 'madrugada';
  if (hora < 8) return 'temprano';
  if (hora < 12) return 'manana';
  if (hora < 14) return 'mediodia';
  if (hora < 19) return 'tarde';
  return 'noche';
}

/** Lunes, viernes o fin de semana (sábado y domingo); los demás días no tienen frases propias. */
export function diaConFrases(fecha: Date): DiaConFrases | null {
  const dia = fecha.getDay();
  if (dia === 1) return 'lunes';
  if (dia === 5) return 'viernes';
  if (dia === 0 || dia === 6) return 'finDeSemana';
  return null;
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

/**
 * Identifica el momento: mientras no cambie, la elección es la misma. Así el
 * saludo no salta cada minuto ni al recargar, y cambia al pasar de franja o de día.
 */
export function claveDelMomento(fecha: Date, nombre: string): string {
  const dia = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
  return `${dia}|${franjaDelDia(fecha)}|${nombre}`;
}

export interface EleccionSaludo {
  readonly saludo: SaludoId;
  readonly frase: FraseId;
}

/**
 * Elige el saludo y la frase del momento. Es determinista: la misma clave da
 * siempre lo mismo. `evitar` es la frase que se mostró la vez anterior; se
 * descarta si el grupo tiene otra con qué reemplazarla.
 */
export function elegirSaludo(fecha: Date, clave: string, evitar?: string | null): EleccionSaludo {
  const azar = generador(clave);
  const franja = franjaDelDia(fecha);

  const saludos: readonly SaludoId[] = SALUDOS_POR_FRANJA[franja];
  const saludo =
    azar() < PROBABILIDAD_CLASICO || saludos.length === 1
      ? saludos[0]
      : saludos[1 + Math.floor(azar() * (saludos.length - 1))];

  const dia = diaConFrases(fecha);
  const grupos: { peso: number; frases: readonly FraseId[] }[] = [
    { peso: PESO.franja, frases: FRASES_POR_FRANJA[franja] },
    { peso: PESO.general, frases: FRASES_GENERALES },
  ];
  if (dia) grupos.push({ peso: PESO.dia, frases: FRASES_POR_DIA[dia] });

  const grupo = sortearGrupo(grupos, azar());
  const candidatas = grupo.length > 1 ? grupo.filter((id) => id !== evitar) : grupo;
  const frase = candidatas[Math.floor(azar() * candidatas.length)];

  return { saludo, frase };
}

function sortearGrupo(
  grupos: readonly { peso: number; frases: readonly FraseId[] }[],
  r: number,
): readonly FraseId[] {
  const total = grupos.reduce((suma, g) => suma + g.peso, 0);
  let acumulado = 0;
  for (const g of grupos) {
    acumulado += g.peso / total;
    if (r < acumulado) return g.frases;
  }
  return grupos[grupos.length - 1].frases;
}

/** Números en [0, 1) que salen siempre iguales para la misma semilla (FNV-1a + mulberry32). */
function generador(semilla: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < semilla.length; i++) {
    h ^= semilla.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let estado = h >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
