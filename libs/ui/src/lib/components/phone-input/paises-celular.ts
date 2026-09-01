/**
 * Catálogo curado de países para el selector de indicativo del celular.
 *
 * Corto a propósito: los países donde reddoc opera o puede recibir clientes
 * (LatAm + US/CA + ES), no los ~240 del planeta. Agregar uno es sumar una
 * línea; el nombre localizado NO vive acá — sale de `Intl.DisplayNames` con el
 * idioma activo, así no hay tabla de nombres que mantener en dos idiomas.
 */
export interface PaisCelular {
  /** ISO 3166-1 alfa-2, en mayúsculas (`CO`). Clave estable del catálogo. */
  readonly iso: string;
  /** Indicativo E.164 sin `+` (`57`). */
  readonly indicativo: string;
  /**
   * Largos válidos del número nacional de un celular, si se conocen. Sin esta
   * lista el componente solo exige el rango genérico de E.164.
   */
  readonly longitudes?: readonly number[];
}

/**
 * `US` va antes que `CA` y `DO` a propósito: los tres comparten `+1` y al
 * partir un E.164 gana el primero que matchee. Un `+1...` guardado se mostrará
 * con bandera de US aunque sea canadiense o dominicano — el número compuesto
 * no cambia.
 */
export const PAISES_CELULAR: readonly PaisCelular[] = [
  { iso: 'CO', indicativo: '57', longitudes: [10] },
  { iso: 'MX', indicativo: '52', longitudes: [10] },
  { iso: 'AR', indicativo: '54', longitudes: [10] },
  { iso: 'BR', indicativo: '55', longitudes: [10, 11] },
  { iso: 'PE', indicativo: '51', longitudes: [9] },
  { iso: 'CL', indicativo: '56', longitudes: [9] },
  { iso: 'EC', indicativo: '593', longitudes: [9] },
  { iso: 'VE', indicativo: '58', longitudes: [10] },
  { iso: 'BO', indicativo: '591', longitudes: [8] },
  { iso: 'UY', indicativo: '598', longitudes: [8, 9] },
  { iso: 'PY', indicativo: '595', longitudes: [9] },
  { iso: 'PA', indicativo: '507', longitudes: [8] },
  { iso: 'CR', indicativo: '506', longitudes: [8] },
  { iso: 'GT', indicativo: '502', longitudes: [8] },
  { iso: 'HN', indicativo: '504', longitudes: [8] },
  { iso: 'SV', indicativo: '503', longitudes: [8] },
  { iso: 'NI', indicativo: '505', longitudes: [8] },
  { iso: 'US', indicativo: '1', longitudes: [10] },
  { iso: 'CA', indicativo: '1', longitudes: [10] },
  { iso: 'DO', indicativo: '1', longitudes: [10] },
  { iso: 'ES', indicativo: '34', longitudes: [9] },
];
