import type { ColumnDef, FilterField } from '@reddoc/core';

/**
 * Genera las líneas del cierre: traslada los saldos de las cuentas de resultado
 * del rango indicado a la cuenta de cierre.
 *
 * ⚠️ **Supuesto**: tomado de `FacturaService.cargarResultados` del ERP legacy
 * (`POST general/documento/cargar-cierre/` con
 * `{ id, cuenta_desde_codigo, cuenta_hasta_codigo, cuenta_cierre_id }`), sin
 * verificar contra el backend.
 */
export const CARGAR_CIERRE_ENDPOINT = '/general/documento/cargar-cierre/';

/**
 * Borra **todas** las líneas del documento de un golpe.
 *
 * ⚠️ **Supuesto y divergencia**: el legacy pega a
 * `general/documento_detalle/eliminar-todos/` — con guion **bajo**—, mientras que
 * todo el framework de documentos de este ERP usa `general/documento-detalle/`
 * con guion. Se replica la ruta del legacy porque es la única evidencia que hay
 * de que este endpoint existe; si el backend solo expone la forma con guion, acá
 * responde 404 y el fix es esta constante.
 */
export const ELIMINAR_DETALLES_ENDPOINT = '/general/documento_detalle/eliminar-todos/';

/** Líneas por página en la sección de detalles del cierre. */
export const CIERRE_DETALLE_PAGE_SIZE = 50;

/**
 * Columnas visibles del listado de Cierre contable.
 *
 * Un cierre no tiene subtotal ni impuestos: sus líneas son el traslado de saldos
 * de las cuentas de resultado. El set se queda en identificación del documento,
 * tercero y estados. Los `field` mapean el shape de `general/documento/lista/`.
 */
export const CIERRE_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.cierre.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'numero',
    headerKey: 'entities.cierre.columns.numero',
    type: 'text',
    width: '130px',
  },
  {
    field: 'fecha',
    headerKey: 'entities.cierre.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'tercero_numero_identificacion',
    headerKey: 'entities.cierre.columns.identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.cierre.columns.contacto',
    type: 'text',
  },
  {
    field: 'total',
    headerKey: 'entities.cierre.columns.total',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'estado_aprobado',
    headerKey: 'entities.cierre.columns.aprobado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_anulado',
    headerKey: 'entities.cierre.columns.anulado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'estado_contabilizado',
    headerKey: 'entities.cierre.columns.contabilizado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
];

/**
 * Filtros visibles del listado. El filtro implícito `documento_tipo_id` lo
 * inyecta el gateway desde el config; aquí solo van los del usuario.
 */
export const CIERRE_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.cierre.columns.numero', type: 'string' },
  { name: 'fecha', displayNameKey: 'entities.cierre.columns.fecha', type: 'date' },
  {
    name: 'contacto__numero_identificacion',
    displayNameKey: 'entities.cierre.columns.identificacion',
    type: 'string',
  },
  {
    name: 'contacto__nombre_corto',
    displayNameKey: 'entities.cierre.columns.contacto',
    type: 'string',
  },
  { name: 'estado_aprobado', displayNameKey: 'entities.cierre.filters.aprobado', type: 'boolean' },
  { name: 'estado_anulado', displayNameKey: 'entities.cierre.filters.anulado', type: 'boolean' },
  {
    name: 'estado_contabilizado',
    displayNameKey: 'entities.cierre.filters.contabilizado',
    type: 'boolean',
  },
];
