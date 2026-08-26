/**
 * Tipo de valor de una columna. Determina el formateo en la tabla.
 *
 * - `text`:     string crudo
 * - `number`:   número con formato local
 * - `currency`: número con símbolo de moneda
 * - `date`:     fecha formateada (acepta ISO o Date)
 * - `boolean`:  badge sí/no
 * - `enum`:     valor traducido via clave i18n (`enumKeyPrefix.<value>`)
 * - `combined`: varias props en una celda (`parts`), unidas por `separator`
 */
export type ColumnValueType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'combined';

/** Formateo admitido por cada parte de una columna `combined` (sin anidar ni i18n). */
export type ColumnPartType = 'text' | 'number' | 'currency' | 'date';

/**
 * Una parte de una columna `combined`: qué campo leer y cómo formatearlo. Ej. para
 * mostrar `horas / horas_programadas`, dos partes `{ field, type: 'number' }`.
 */
export interface ColumnPart {
  /** Nombre del campo en el row (acceso por `row[field]`). */
  readonly field: string;
  /** Formateo de esta parte. Default `'text'`. */
  readonly type?: ColumnPartType;
}

/** Alineación horizontal del contenido de la columna. */
export type ColumnAlignment = 'left' | 'center' | 'right';

/**
 * Descriptor de una columna de la tabla.
 *
 * Cualquier consumidor (un documento del framework via `BaseDocumentListComponent`,
 * o una página de master via `<lib-data-table>` directo) declara su lista de
 * columnas y la tabla itera sobre ellas para renderizar header + celda según
 * el `type`.
 */
/** Qué significa un `true` en una columna booleana: un estado deseable o uno adverso. */
export type BooleanTone = 'positive' | 'negative';

export interface ColumnDef {
  /** Nombre del campo en el row (acceso por `row[field]`). */
  readonly field: string;
  /** Clave i18n del título de la columna. */
  readonly headerKey: string;
  /** Tipo del valor — controla el formateo. */
  readonly type: ColumnValueType;
  /** Ancho CSS opcional (p. ej. `'120px'`, `'10rem'`). */
  readonly width?: string;
  /** Si la columna soporta ordenamiento desde el header. */
  readonly sortable?: boolean;
  /** Alineación horizontal. Default: `'left'`. */
  readonly align?: ColumnAlignment;
  /**
   * Para `type === 'enum'`: prefijo i18n para resolver el label visible.
   * El valor final se busca como `${enumKeyPrefix}.${row[field]}`.
   */
  readonly enumKeyPrefix?: string;
  /**
   * Para `type === 'boolean'`: prefijo i18n para resolver los labels de
   * verdadero y falso. Default: `'common.boolean'`.
   * Resuelve `${prefix}.true` y `${prefix}.false` del diccionario activo.
   * Permite personalizar por columna: `'common.boolAccepted'` → "Aceptado/Rechazado".
   */
  readonly booleanKeyPrefix?: string;
  /**
   * Para `type === 'boolean'`: qué significa que el valor sea verdadero.
   *
   * El badge se pintaba siempre verde en `true`, así que una columna como
   * `inactivo` mostraba «Sí» en verde —el color decía lo contrario del dato—.
   * Con `'negative'` el verdadero se pinta en ámbar; el falso queda neutro en
   * ambos casos, porque «no está inactivo» no es un logro que destacar.
   *
   * Default `'positive'`: las columnas que no lo declaran no cambian.
   */
  readonly booleanTone?: BooleanTone;
  /**
   * Para `type === 'combined'`: las partes a mostrar en la misma celda, cada una
   * formateada según su `type` y unidas por `separator`. El `field` de la columna se
   * mantiene para la key/orden; las partes definen qué se pinta.
   */
  readonly parts?: readonly ColumnPart[];
  /** Para `type === 'combined'`: separador entre partes. Default `'/'`. */
  readonly separator?: string;
}
