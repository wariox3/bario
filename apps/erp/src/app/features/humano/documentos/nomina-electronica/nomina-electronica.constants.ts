import type { ColumnDef, FilterField } from '@reddoc/core';

/** Prefijo i18n del documento — evita repetir la ruta en cada columna. */
const I18N = 'entities.nominaElectronica';

/**
 * Columnas visibles del listado de Nómina electrónica.
 *
 * El mapeo del legacy para este documento declara además `fecha_desde`,
 * `fecha_hasta`, `salario` y `contrato_id` — todos campos de la **nómina
 * individual**, copiados del mapeo de la nómina (701). Su propia ficha no los
 * muestra y usa `fecha` a secas, porque un consolidado del periodo no tiene un
 * salario ni un contrato: puede resumir varias nóminas. Acá se omiten.
 */
export const NOMINA_ELECTRONICA_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.columns.id`, type: 'number', width: '80px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.columns.numero`, type: 'text', width: '110px' },
  { field: 'fecha', headerKey: `${I18N}.columns.fecha`, type: 'date', width: '110px' },
  {
    field: 'tercero_numero_identificacion',
    headerKey: `${I18N}.columns.identificacion`,
    type: 'text',
    width: '140px',
  },
  { field: 'contacto_nombre', headerKey: `${I18N}.columns.empleado`, type: 'text' },
  {
    field: 'base_cotizacion',
    headerKey: `${I18N}.columns.baseCotizacion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'base_prestacion',
    headerKey: `${I18N}.columns.basePrestacion`,
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
    field: 'estado_electronico',
    headerKey: `${I18N}.columns.electronico`,
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
 *
 * El estado electrónico es el filtro que da sentido a esta lista: "¿cuáles ya
 * están en la DIAN?".
 */
export const NOMINA_ELECTRONICA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: `${I18N}.columns.numero`, type: 'string' },
  { name: 'fecha', displayNameKey: `${I18N}.columns.fecha`, type: 'date' },
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
  { name: 'estado_electronico', displayNameKey: `${I18N}.filters.electronico`, type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: `${I18N}.filters.contabilizado`,
    type: 'boolean',
  },
];

/**
 * Columnas de la pestaña **"Nóminas"** de la ficha: las nóminas origen que
 * componen el consolidado. Se omite el FK crudo del contacto que pintaba el
 * legacy (redundante con la identificación y el nombre que van al lado).
 */
export const NOMINA_ELECTRONICA_ORIGEN_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.origen.id`, type: 'number', width: '80px', align: 'right' },
  { field: 'numero', headerKey: `${I18N}.origen.numero`, type: 'text', width: '100px' },
  { field: 'fecha_desde', headerKey: `${I18N}.origen.desde`, type: 'date', width: '110px' },
  { field: 'fecha_hasta', headerKey: `${I18N}.origen.hasta`, type: 'date', width: '110px' },
  {
    field: 'contacto_numero_identificacion',
    headerKey: `${I18N}.origen.identificacion`,
    type: 'text',
    width: '140px',
  },
  { field: 'contacto_nombre_corto', headerKey: `${I18N}.origen.empleado`, type: 'text' },
  {
    field: 'salario',
    headerKey: `${I18N}.origen.salario`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'devengado',
    headerKey: `${I18N}.origen.devengado`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: `${I18N}.origen.deduccion`,
    type: 'currency',
    width: '120px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.origen.total`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: `${I18N}.origen.aprobado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: `${I18N}.origen.anulado`,
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Columnas de la pestaña **"Detalle"**: los conceptos consolidados.
 *
 * El legacy repetía en cada fila el empleado y el rango del periodo; todas las
 * líneas son del mismo documento, así que esos valores son constantes y ya
 * están arriba. Quedan solo las columnas que varían fila a fila.
 */
export const NOMINA_ELECTRONICA_DETALLE_COLUMNS: readonly ColumnDef[] = [
  { field: 'id', headerKey: `${I18N}.detalle.id`, type: 'number', width: '80px', align: 'right' },
  { field: 'concepto_nombre', headerKey: `${I18N}.detalle.concepto`, type: 'text' },
  {
    field: 'base_cotizacion',
    headerKey: `${I18N}.detalle.baseCotizacion`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'base_prestacion',
    headerKey: `${I18N}.detalle.basePrestacion`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'devengado',
    headerKey: `${I18N}.detalle.devengado`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'deduccion',
    headerKey: `${I18N}.detalle.deduccion`,
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: `${I18N}.detalle.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
];

/** URL pública de la DIAN para consultar un documento electrónico por su CUNE. */
export const DIAN_DOCUMENT_URL = 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=';
