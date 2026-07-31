import type { ColumnDef, FilterField } from '@reddoc/core';

/** Prefijo i18n del documento — evita repetir la ruta en cada columna. */
const I18N = 'entities.seguridadSocial';

/**
 * Columnas visibles del listado de Aporte a seguridad social.
 *
 * El periodo va en dos columnas (`fecha` = desde, `fecha_hasta` = hasta), que es
 * como lo rotula el ERP anterior: acá `fecha` no es una fecha de emisión sino el
 * inicio del rango liquidado. Es la misma inconsistencia de nombres que ya está
 * anotada en §1.4 para los informes.
 *
 * Se omite el FK crudo del contacto que pintaba el legacy: redundante con la
 * identificación y el nombre que van al lado.
 */
export const SEGURIDAD_SOCIAL_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '80px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.desde`, type: 'date', width: '110px' },
  { field: 'fecha_hasta', headerKey: `${I18N}.columns.hasta`, type: 'date', width: '110px' },
  {
    field: 'tercero_numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '140px',
  },
  { field: 'contacto_nombre', headerKey: `${I18N}.columns.empleado`, type: 'text' },
  {
    field: 'salario',
    headerKey: `${I18N}.columns.salario`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'devengado',
    headerKey: `${I18N}.columns.devengado`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: `${I18N}.columns.deduccion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: `${I18N}.columns.aprobado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: `${I18N}.columns.anulado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: `${I18N}.columns.contabilizado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const SEGURIDAD_SOCIAL_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
  { name: 'fecha', displayNameKey: `${I18N}.columns.desde`, type: 'date' },
  { name: 'fecha_hasta', displayNameKey: `${I18N}.columns.hasta`, type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: `${I18N}.columns.identificacion`,
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: `${I18N}.columns.empleado`,
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: `${I18N}.filters.aprobado`, type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: `${I18N}.filters.anulado`, type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: `${I18N}.filters.contabilizado`,
    type: 'boolean',
  },
];

/** Columnas de la tabla de líneas de la ficha: qué se aportó y cuánto. */
export const SEGURIDAD_SOCIAL_DETALLE_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.detalle.id`, type: 'number', width: '80px', align: 'right' },
  { field: 'detalle', headerKey: `${I18N}.detalle.detalle`, type: 'text' },
  {
    field: 'pago',
    headerKey: `${I18N}.detalle.pago`,
    type: 'currency',
    width: '160px',
    align: 'right',
  },
];

/** URL pública de la DIAN para consultar un documento electrónico por su código. */
export const DIAN_DOCUMENT_URL = 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=';
