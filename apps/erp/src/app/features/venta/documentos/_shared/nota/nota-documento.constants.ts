import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Constantes compartidas por las **notas de venta**: nota crédito (2) y nota
 * débito (3).
 */

/** Endpoint `seleccionar` de sedes. */
export const SEDE_ENDPOINT = '/general/sede/seleccionar/';
/** Endpoint `seleccionar` de métodos de pago. */
export const METODO_PAGO_ENDPOINT = '/general/metodo-pago/seleccionar/';

/**
 * Endpoint (GET) que lista los documentos referenciables por la nota (facturas
 * de venta aprobadas del cliente). Reusa el endpoint genérico de documentos con
 * `serializador=referencia` (mismo contrato que el legacy). Es de uso único de
 * esta familia, por eso vive aquí y no en `SELECT_ENDPOINTS`.
 */
export const NOTA_VENTA_REFERENCIA_ENDPOINT = '/general/documento/';

/**
 * Construye las columnas del listado de una nota de venta para el namespace i18n
 * dado (`'notaCredito'`, `'notaDebito'`). La estructura es idéntica entre las
 * notas; solo cambian las claves i18n. Mismo set canónico de
 * `DocumentoListRowBase` que la factura de venta.
 */
export function buildNotaColumns(i18nNamespace: string): readonly ColumnDef[] {
  const ns = `entities.${i18nNamespace}.columns`;
  return [
    { field: 'id', headerKey: `${ns}.id`, type: 'number', width: '80px', align: 'right' },
    { field: 'numero', headerKey: `${ns}.numero`, type: 'text', width: '130px' },
    { field: 'fecha', headerKey: `${ns}.fecha`, type: 'date', width: '110px' },
    {
      field: 'tercero_numero_identificacion',
      headerKey: `${ns}.identificacion`,
      type: 'text',
      width: '140px',
    },
    { field: 'contacto_nombre', headerKey: `${ns}.contacto`, type: 'text' },
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
    { field: 'total', headerKey: `${ns}.total`, type: 'currency', width: '140px', align: 'right' },
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

/**
 * Construye los filtros visibles del listado de una nota de venta para el
 * namespace i18n dado. El filtro implícito `documento_tipo_id` lo inyecta el
 * gateway desde `documentTypeId` del config — acá solo van los del usuario.
 */
export function buildNotaFilters(i18nNamespace: string): readonly FilterField[] {
  const cols = `entities.${i18nNamespace}.columns`;
  const filters = `entities.${i18nNamespace}.filters`;
  return [
    { name: 'numero', displayNameKey: `${cols}.numero`, type: 'string' },
    { name: 'fecha', displayNameKey: `${cols}.fecha`, type: 'date' },
    {
      name: 'contacto__numero_identificacion',
      displayNameKey: `${cols}.identificacion`,
      type: 'string',
    },
    { name: 'contacto__nombre_corto', displayNameKey: `${cols}.contacto`, type: 'string' },
    { name: 'estado_aprobado', displayNameKey: `${filters}.aprobado`, type: 'boolean' },
    { name: 'estado_anulado', displayNameKey: `${filters}.anulado`, type: 'boolean' },
    { name: 'estado_contabilizado', displayNameKey: `${filters}.contabilizado`, type: 'boolean' },
  ];
}
