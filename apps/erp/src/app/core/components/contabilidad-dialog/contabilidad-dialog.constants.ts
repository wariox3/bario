import type { ColumnDef } from '@reddoc/core';

/**
 * Columnas del libro contable **de un documento**, en el orden del ERP anterior:
 * identificación del movimiento, a quién y a qué se imputó, y los valores.
 *
 * Es la misma lectura que la consulta de movimientos, menos el **número**: acá
 * todas las filas pertenecen al documento abierto, así que repetir su
 * consecutivo en cada línea no informa nada. Las etiquetas reusan las claves
 * de esa consulta para que un cambio de copy alcance a las dos pantallas.
 *
 * Sin orden por columna: son las líneas de un solo asiento y se leen como el
 * backend las devuelve.
 */
export const CONTABILIDAD_DIALOG_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.movimientoContable.columns.id',
    type: 'number',
    width: '80px',
    align: 'right',
  },
  {
    field: 'fecha',
    headerKey: 'entities.movimientoContable.columns.fecha',
    type: 'date',
    width: '110px',
  },
  {
    field: 'comprobante_nombre',
    headerKey: 'entities.movimientoContable.columns.comprobante',
    type: 'text',
    width: '140px',
  },
  {
    field: 'contacto_nombre_corto',
    headerKey: 'entities.movimientoContable.columns.contacto',
    type: 'text',
  },
  {
    field: 'cuenta_codigo',
    headerKey: 'entities.movimientoContable.columns.cuenta',
    type: 'text',
    width: '110px',
  },
  {
    field: 'centro_costo_nombre',
    headerKey: 'entities.movimientoContable.columns.centroCosto',
    type: 'text',
    width: '150px',
  },
  {
    field: 'debito',
    headerKey: 'entities.movimientoContable.columns.debito',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'credito',
    headerKey: 'entities.movimientoContable.columns.credito',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'base',
    headerKey: 'entities.movimientoContable.columns.base',
    type: 'currency',
    width: '130px',
    align: 'right',
  },
  {
    field: 'detalle',
    headerKey: 'entities.movimientoContable.columns.detalle',
    type: 'text',
  },
];

/** Tamaño de página inicial del libro dentro del diálogo. */
export const CONTABILIDAD_DIALOG_PAGE_SIZE = 25;
