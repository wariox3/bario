import type { ColumnDef, FilterField } from '@reddoc/core';

export const HISTORIAL_MOVIMIENTO_FILTERS_STORAGE_KEY = 'historial-movimiento:filters:v1';

/**
 * Columnas del informe: el documento que movió el inventario (número, tipo,
 * fecha, contacto), dónde y qué se movió (almacén, ítem) y los valores de la
 * línea.
 *
 * Los nombres son **planos**, como los devuelve el informe. Antes replicaban el
 * lookup de Django del ERP legacy (`documento__numero`) y por eso salían vacías:
 * `<lib-data-table>` resuelve el valor con `row[field]`, no traduce rutas ORM.
 *
 * **La tabla no ordena.** `excel/` no acepta `ordenamientos`, así que dejar la
 * cabecera ordenable haría que la pantalla y el archivo descargado salieran en
 * órdenes distintos sin que nadie lo avise.
 */
export const HISTORIAL_MOVIMIENTO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.historialMovimiento.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'documento_numero',
    headerKey: 'entities.historialMovimiento.columns.numero',
    type: 'text',
    width: '110px',
  },
  {
    field: 'documento_tipo_nombre',
    headerKey: 'entities.historialMovimiento.columns.documentoTipo',
    type: 'text',
    width: '150px',
  },
  {
    field: 'documento_fecha',
    headerKey: 'entities.historialMovimiento.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.historialMovimiento.columns.contacto',
    type: 'text',
  },
  {
    // En un historial de inventario el almacén no es un dato más: dice sobre
    // qué saldo pegó el movimiento.
    field: 'almacen_nombre',
    headerKey: 'entities.historialMovimiento.columns.almacen',
    type: 'text',
    width: '140px',
  },
  {
    field: 'item_codigo',
    headerKey: 'entities.historialMovimiento.columns.itemCodigo',
    type: 'text',
    width: '130px',
  },
  {
    field: 'item_nombre',
    headerKey: 'entities.historialMovimiento.columns.item',
    type: 'text',
  },
  {
    // `cantidad_operada` y no `cantidad`: trae el signo del movimiento, así que
    // es la que deja leer entradas y salidas de un vistazo.
    field: 'cantidad_operada',
    headerKey: 'entities.historialMovimiento.columns.cantidad',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'costo',
    headerKey: 'entities.historialMovimiento.columns.costo',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'precio',
    headerKey: 'entities.historialMovimiento.columns.precio',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'detalle',
    headerKey: 'entities.historialMovimiento.columns.detalle',
    type: 'text',
  },
];

/**
 * Campos por los que se puede filtrar.
 *
 * **Van con doble guion bajo a propósito**: los `filtros` viajan al backend como
 * rutas ORM sobre `GenDocumentoDetalle`, a diferencia de las columnas de arriba,
 * que leen el JSON ya aplanado. No unificar unos con otras.
 *
 * `cantidad` filtra sobre la cantidad sin signo, no sobre la `cantidad_operada`
 * que muestra la tabla.
 *
 * TODO(backend): sin confirmar. La whitelist de `campos_filtrables` de este
 * informe no está publicada; un filtro fuera de ella no da error, devuelve el
 * informe sin filtrar.
 */
export const HISTORIAL_MOVIMIENTO_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'id', displayNameKey: 'entities.historialMovimiento.columns.id', type: 'number' },
  {
    name: 'documento__numero',
    displayNameKey: 'entities.historialMovimiento.columns.numero',
    type: 'number',
  },
  {
    name: 'documento__fecha',
    displayNameKey: 'entities.historialMovimiento.columns.fecha',
    type: 'date',
  },
  {
    name: 'documento__contacto__nombre_corto',
    displayNameKey: 'entities.historialMovimiento.columns.contacto',
    type: 'string',
  },
  {
    name: 'almacen__nombre',
    displayNameKey: 'entities.historialMovimiento.columns.almacen',
    type: 'string',
  },
  {
    name: 'item__codigo',
    displayNameKey: 'entities.historialMovimiento.columns.itemCodigo',
    type: 'string',
  },
  {
    name: 'item__nombre',
    displayNameKey: 'entities.historialMovimiento.columns.item',
    type: 'string',
  },
  {
    name: 'cantidad',
    displayNameKey: 'entities.historialMovimiento.columns.cantidad',
    type: 'number',
  },
];
