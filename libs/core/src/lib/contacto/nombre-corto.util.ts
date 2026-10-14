export interface NombresInput {
  readonly nombre1: string | null;
  readonly nombre2: string | null;
  readonly apellido1: string | null;
  readonly apellido2: string | null;
}

/**
 * Compone `nombre_corto` para PERSONA_NATURAL: "nombre1 [nombre2] apellido1 [apellido2]".
 * Los segmentos vacíos se omiten para evitar dobles espacios.
 */
export function construirNombreCorto(nombres: NombresInput): string {
  return [nombres.nombre1, nombres.nombre2, nombres.apellido1, nombres.apellido2]
    .map((v) => v?.trim() ?? '')
    .filter((v) => v.length > 0)
    .join(' ');
}
