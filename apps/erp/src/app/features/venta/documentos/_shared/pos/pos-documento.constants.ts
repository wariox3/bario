import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Constantes compartidas por los **documentos POS** (punto de venta): factura
 * POS, factura POS electrónica y futuros de la misma familia.
 */

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Construye las columnas del listado de un documento POS para el namespace i18n
 * dado (`'facturaPos'`, `'facturaPosElectronica'`…). La estructura es idéntica
 * entre documentos de la familia; solo cambian las claves i18n. Si un documento
 * necesita divergir, deja de usar la factory para esa columna.
 *
 * Es el mismo set que la factura de venta (id, identificación, desglose de
 * montos y flags de estado): todos son comerciales (ítem/cantidad/precio) y
 * comparten el shape canónico del endpoint `general/documento/lista/`
 * (`DocumentoListRowBase`).
 */
export function buildPosColumns(i18nNamespace: string): readonly ColumnDef[] {
  const ns = `entities.${i18nNamespace}.columns`;
  return [
    {
      field: 'id',
      headerKey: `${ns}.id`,
      type: 'number',
      width: '80px',
      align: 'right',
    },
    {
      field: 'numero',
      headerKey: `${ns}.numero`,
      type: 'text',
      width: '130px',
    },
    {
      field: 'fecha',
      headerKey: `${ns}.fecha`,
      type: 'date',
      width: '110px',
    },
    {
      field: 'tercero_numero_identificacion',
      headerKey: `${ns}.identificacion`,
      type: 'text',
      width: '140px',
    },
    {
      field: 'contacto_nombre',
      headerKey: `${ns}.contacto`,
      type: 'text',
    },
    {
      field: 'subtotal',
      headerKey: `${ns}.subtotal`,
      type: 'currency',
      width: '130px',
      align: 'right',
    },
    {
      field: 'impuesto',
      headerKey: `${ns}.impuesto`,
      type: 'currency',
      width: '120px',
      align: 'right',
    },
    {
      field: 'total',
      headerKey: `${ns}.total`,
      type: 'currency',
      width: '140px',
      align: 'right',
    },
    {
      field: 'estado_aprobado',
      headerKey: `${ns}.aprobado`,
      type: 'boolean',
      width: '70px',
      align: 'center',
    },
    {
      field: 'estado_anulado',
      headerKey: `${ns}.anulado`,
      type: 'boolean',
      width: '70px',
      align: 'center',
    },
    {
      field: 'estado_contabilizado',
      headerKey: `${ns}.contabilizado`,
      type: 'boolean',
      width: '70px',
      align: 'center',
    },
  ];
}

/** Opciones de {@link buildPosFilters}. */
export interface PosFiltersOptions {
  /**
   * Suma el filtro `estado_electronico`. Solo aplica a los POS que se transmiten
   * a la DIAN (la factura POS electrónica); en el POS normal el flag no varía.
   */
  readonly electronico?: boolean;
}

/**
 * Construye los filtros visibles del listado de un documento POS para el
 * namespace i18n dado. El filtro implícito `documento_tipo_id` lo inyecta el
 * gateway desde `documentTypeId` del config — acá solo van los del usuario.
 *
 * Los estados usan labels completos (sub-clave `filters.*`) en vez de las
 * cabeceras abreviadas (Apr/Anu/Ele/Con), que en el modal serían ambiguas.
 */
export function buildPosFilters(
  i18nNamespace: string,
  options: PosFiltersOptions = {},
): readonly FilterField[] {
  const cols = `entities.${i18nNamespace}.columns`;
  const filters = `entities.${i18nNamespace}.filters`;
  const electronico: readonly FilterField[] = options.electronico
    ? [{ name: 'estado_electronico', displayNameKey: `${filters}.electronico`, type: 'boolean' }]
    : [];

  return [
    { name: 'numero', displayNameKey: `${cols}.numero`, type: 'string' },
    { name: 'fecha', displayNameKey: `${cols}.fecha`, type: 'date' },
    {
      name: 'contacto__numero_identificacion',
      displayNameKey: `${cols}.identificacion`,
      type: 'string',
    },
    {
      name: 'contacto__nombre_corto',
      displayNameKey: `${cols}.contacto`,
      type: 'string',
    },
    {
      name: 'estado_aprobado',
      displayNameKey: `${filters}.aprobado`,
      type: 'boolean',
    },
    {
      name: 'estado_anulado',
      displayNameKey: `${filters}.anulado`,
      type: 'boolean',
    },
    ...electronico,
    {
      name: 'estado_contabilizado',
      displayNameKey: `${filters}.contabilizado`,
      type: 'boolean',
    },
  ];
}
