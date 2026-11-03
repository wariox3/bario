/**
 * Qué saludos y qué frases caben en cada momento. Solo ids: los textos viven en
 * el dict (`SaludoDict`), que los traduce con un `Record` sobre estos mismos
 * ids — agregar uno aquí obliga a escribirlo en es y en en.
 *
 * La elección se hace sobre los ids y no sobre los textos para que cambiar de
 * idioma muestre la misma frase traducida, no otra.
 *
 * Sin fechas especiales (festivos, Navidad, quincena): la app puede usarse en
 * cualquier país y esas fechas no son de todos. Lo único de calendario que se
 * usa es el día de la semana, con el fin de semana en sábado y domingo.
 */

/** Franjas del día, de la medianoche en adelante. Las horas exactas están en `franjaDelDia`. */
export type FranjaDia = 'madrugada' | 'temprano' | 'manana' | 'mediodia' | 'tarde' | 'noche';

/** Días de la semana que tienen frases propias. */
export type DiaConFrases = 'lunes' | 'viernes' | 'finDeSemana';

/**
 * Saludos de la primera línea, a los que se les suma el nombre ("Buenos días, Mario").
 * El primero de cada franja es el clásico y sale la mitad de las veces: el saludo
 * es lo que orienta, así que varía poco.
 */
export const SALUDOS_POR_FRANJA = {
  madrugada: ['hola', 'buenasNoches'],
  temprano: ['buenosDias', 'buenDia'],
  manana: ['buenosDias', 'hola', 'buenDia'],
  mediodia: ['buenasTardes', 'hola'],
  tarde: ['buenasTardes', 'hola'],
  noche: ['buenasNoches', 'hola'],
} as const satisfies Record<FranjaDia, readonly string[]>;

export type SaludoId = (typeof SALUDOS_POR_FRANJA)[FranjaDia][number];

/** Frases de la segunda línea según la hora. */
export const FRASES_POR_FRANJA = {
  madrugada: [
    'madrugadaTempranoOTarde',
    'madrugadaIdeas',
    'madrugadaConcentrarse',
    'madrugadaAqui',
  ],
  temprano: [
    'tempranoCafe',
    'tempranoArrancando',
    'tempranoDiaPorDelante',
    'tempranoPrimeroLoPrimero',
  ],
  manana: ['mananaQueHacemos', 'mananaComoVa', 'mananaQueRinda', 'mananaSegundoCafe'],
  mediodia: ['mediodiaAlmorzaste', 'mediodiaProvecho', 'mediodiaMitad', 'mediodiaRetomar'],
  tarde: ['tardeConTodo', 'tardeComoVa', 'tardeCafe', 'tardeAvanzando', 'tardePendientes'],
  noche: ['nocheUltimaVuelta', 'nocheTenerte', 'nocheTranquila', 'nocheCasiCierre'],
} as const satisfies Record<FranjaDia, readonly string[]>;

/** Frases que dependen del día de la semana; valen a cualquier hora. */
export const FRASES_POR_DIA = {
  lunes: ['lunesLista', 'lunesPaginaEnBlanco', 'lunesQueSalga'],
  viernes: ['viernesCasi', 'viernesOrden', 'viernesEmpujon'],
  finDeSemana: ['finDeSemanaRinda', 'finDeSemanaRapido', 'finDeSemanaPonerseAlDia'],
} as const satisfies Record<DiaConFrases, readonly string[]>;

/** Frases que valen siempre. */
export const FRASES_GENERALES = [
  'generalComoEstas',
  'generalDeVuelta',
  'generalListo',
  'generalPasoAPaso',
  'generalSeguimos',
] as const;

export type FraseId =
  | (typeof FRASES_POR_FRANJA)[FranjaDia][number]
  | (typeof FRASES_POR_DIA)[DiaConFrases][number]
  | (typeof FRASES_GENERALES)[number];
