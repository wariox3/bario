export interface Exogena {
  readonly id: number;
  readonly anio: number;
  readonly comentario: string | null;
  readonly estado_generado: boolean;
  readonly estado_presentado: boolean;
}

export interface ExogenaCrearPayload {
  anio: number;
  comentario: string | null;
}

/** El backend solo deja cambiar el comentario: el año responde 400. */
export interface ExogenaEditarPayload {
  comentario: string | null;
}

/** Un formato de la exógena de un año. */
export interface ExogenaFormato {
  readonly id: number;
  readonly exogena: number;
  readonly formato: number;
  readonly formato_nombre: string | null;
  readonly cuantia_menor: string;
  readonly registros: number;
  readonly total: string;
  readonly fecha_generacion: string | null;
  readonly estado_generado: boolean;
  readonly estado_presentado: boolean;
}

export interface ExogenaCargarFormatosRespuesta {
  readonly creados: number;
  readonly detalles: readonly ExogenaFormato[];
}
