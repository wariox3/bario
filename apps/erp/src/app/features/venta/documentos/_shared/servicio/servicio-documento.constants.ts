import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Constantes compartidas por los **documentos de servicio** (vigilancia):
 * contrato servicio, pedido servicio y futuros de la misma familia.
 *
 * Endpoints de selección sin fuente propia en el front; se asume la convención
 * `<recurso>/seleccionar/` — ajustar aquí si el backend difiere.
 */
export const SECTOR_ENDPOINT = '/general/sector/seleccionar/';
export const MODALIDAD_ENDPOINT = '/general/modalidad/seleccionar/';
export const PUESTO_ENDPOINT = '/turno/puesto/seleccionar/';

/**
 * Opciones fijas de estrato socioeconómico (1 a 6). El backend espera el id
 * numérico; aquí el id coincide con el número visible.
 */
export const ESTRATO_OPTIONS: readonly { readonly label: string; readonly value: number }[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
];

/**
 * Construye las columnas del listado de un documento de servicio para el
 * namespace i18n dado (`'contratoServicio'`, `'pedidoServicio'`…). La estructura
 * es idéntica entre documentos de la familia; solo cambian las claves i18n. Si
 * un documento necesita divergir, deja de usar la factory para esa columna.
 *
 * Los `field` mapean el shape real del endpoint `general/documento/lista/`:
 * la identificación del tercero llega como `contacto_numero_identificacion`,
 * los montos como `currency` y los estados como flags booleanos.
 */
export function buildServicioColumns(i18nNamespace: string): readonly ColumnDef[] {
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
      field: 'contacto_numero_identificacion',
      headerKey: `${ns}.identificacion`,
      type: 'text',
      width: '140px',
    },
    {
      field: 'contacto_nombre_corto',
      headerKey: `${ns}.contacto`,
      type: 'text',
    },
    {
      field: 'horas',
      headerKey: `${ns}.horas`,
      type: 'number',
      width: '100px',
      align: 'right',
    },
    {
      field: 'horas_diurnas',
      headerKey: `${ns}.horasDiurnas`,
      type: 'number',
      width: '110px',
      align: 'right',
    },
    {
      field: 'horas_nocturnas',
      headerKey: `${ns}.horasNocturnas`,
      type: 'number',
      width: '110px',
      align: 'right',
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

/**
 * Construye los filtros visibles del listado de un documento de servicio para el
 * namespace i18n dado. El filtro implícito `documento_tipo_id` lo inyecta el
 * gateway desde `documentTypeId` del config — acá solo van los del usuario.
 *
 * Los estados usan labels completos (sub-clave `filters.*`) en vez de las
 * cabeceras abreviadas (Apr/Anu/Ele/Con), que en el modal serían ambiguas.
 */
export function buildServicioFilters(i18nNamespace: string): readonly FilterField[] {
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
    {
      name: 'estado_electronico',
      displayNameKey: `${filters}.electronico`,
      type: 'boolean',
    },
    {
      name: 'estado_contabilizado',
      displayNameKey: `${filters}.contabilizado`,
      type: 'boolean',
    },
  ];
}
