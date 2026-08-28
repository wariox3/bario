import type { ColumnDef, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';

export const CREDITOS_FILTERS_STORAGE_KEY = 'creditos:filters:v1';
export const CREDITOS_QUICK_SEARCH_FIELD = 'contrato_nombre';

/** Segmentos de ruta del listado, relativos al tenant. */
export const CREDITO_LIST_PATH = ['humano', 'creditos'] as const;

/** Endpoint del selector de concepto (búsqueda por `nombre__icontains`). */
export const CONCEPTO_ENDPOINT = '/humano/concepto/seleccionar/';

/**
 * El catálogo de conceptos sirve a toda la nómina; acá solo valen los del tipo
 * **crédito**. El id `8` viene del ERP anterior, que filtra igual en este mismo
 * formulario; el catálogo de tipos vive en `/humano/concepto-tipo/seleccionar/`.
 *
 * El parámetro va **sin sufijo `_id`**: así se llama el campo en
 * `HumConceptoSeleccionar` y es la convención de FK del backend.
 */
export const CONCEPTO_PARAMS: Record<string, string> = { concepto_tipo: '8' };

export const CREDITOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'entities.credito.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    field: 'contrato_contacto_numero_identificacion',
    headerKey: 'entities.credito.columns.identificacion',
    type: 'text',
    width: '130px',
  },
  {
    field: 'contrato_nombre',
    headerKey: 'entities.credito.columns.nombre',
    type: 'text',
  },
  {
    field: 'fecha_inicio',
    headerKey: 'entities.credito.columns.inicio',
    type: 'date',
    width: '110px',
  },
  {
    field: 'total',
    headerKey: 'entities.credito.columns.total',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'cuota',
    headerKey: 'entities.credito.columns.cuota',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'cuota_actual',
    headerKey: 'entities.credito.columns.cuotaActual',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'cantidad_cuotas',
    headerKey: 'entities.credito.columns.cantidadCuotas',
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'abono',
    headerKey: 'entities.credito.columns.abono',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'saldo',
    headerKey: 'entities.credito.columns.saldo',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'validar_cuotas',
    headerKey: 'entities.credito.columns.validarCuotas',
    type: 'boolean',
    width: '90px',
    align: 'center',
  },
  {
    field: 'pagado',
    headerKey: 'entities.credito.columns.pagado',
    type: 'boolean',
    width: '70px',
    align: 'center',
  },
  {
    field: 'inactivo',
    headerKey: 'entities.credito.columns.inactivo',
    type: 'boolean',
    // Un crédito inactivo no se descuenta: el «sí» es una condición adversa.
    booleanTone: 'negative',
    width: '70px',
    align: 'center',
  },
];

export const CREDITOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'contrato_nombre', displayNameKey: 'entities.credito.columns.nombre', type: 'string' },
  { name: 'concepto_nombre', displayNameKey: 'entities.credito.columns.concepto', type: 'string' },
  { name: 'fecha_inicio', displayNameKey: 'entities.credito.columns.inicio', type: 'date' },
  { name: 'total', displayNameKey: 'entities.credito.columns.total', type: 'number' },
  { name: 'saldo', displayNameKey: 'entities.credito.columns.saldo', type: 'number' },
  { name: 'inactivo', displayNameKey: 'entities.credito.columns.inactivo', type: 'boolean' },
];

export const CREDITOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CREDITOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CREDITOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];
