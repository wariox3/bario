import type { ColumnDef, ErpSelectOption, FilterField } from '@reddoc/core';
import type { RowAction, ToolbarAction } from '@reddoc/feature-base';
import type { ImportMaster } from '@erp/core/components/import-dialog/import-dialog.types';
import { IMPORT_MASTERS_ALL } from '@erp/core/components/import-dialog/import-masters.constant';

export const CONTRATOS_FILTERS_STORAGE_KEY = 'contratos:filters:v1';
export const CONTRATOS_QUICK_SEARCH_FIELD = 'contacto_nombre';

/**
 * Id del tipo de contrato indefinido (sin fecha de fin). Cuando el tipo
 * seleccionado coincide, el formulario oculta `fecha_hasta` y le quita la
 * validación de requerido.
 */
export const CONTRATO_TIPO_INDEFINIDO_ID = 1;

/**
 * Id del tipo de contrato "Aprendíz del Sena". Es el único vínculo laboral al
 * que le corresponden los tipos de cotizante de aprendiz; cualquier otro cotiza
 * como dependiente.
 */
export const CONTRATO_TIPO_APRENDIZ_SENA_ID = 4;

/**
 * Tipo de cotizante "Dependiente" (código `01` de la PILA). Es el que aplica a
 * todo vínculo laboral que no sea el de aprendiz del SENA, y el default de un
 * contrato nuevo.
 *
 * El `nombre` es solo respaldo: el `<lib-api-select>` resuelve la etiqueta
 * contra el catálogo por `id`.
 *
 * TODO(backend): asume que `/humano/tipo-cotizante/seleccionar/` es un catálogo
 * global con ids estables entre tenants, igual que `CONTRATO_TIPO_INDEFINIDO_ID`.
 */
export const TIPO_COTIZANTE_DEPENDIENTE: ErpSelectOption = {
  id: 1,
  codigo: '01',
  nombre: 'Dependiente',
};

/**
 * Tipos de cotizante de aprendiz del SENA: etapa lectiva (código `12`) y etapa
 * productiva (código `19`). Solo válidos con el contrato de aprendiz.
 */
export const TIPO_COTIZANTE_APRENDIZ_IDS: readonly number[] = [5, 9];

/** `true` si el tipo de cotizante es uno de los de aprendiz del SENA. */
export function esTipoCotizanteAprendiz(id: number | null | undefined): boolean {
  return id != null && TIPO_COTIZANTE_APRENDIZ_IDS.includes(id);
}

export const CONTRATO_LIST_PATH = ['humano', 'contratos'] as const;

export const CONTRATOS_COLUMNS: readonly ColumnDef[] = [
  { field: 'contacto_nombre', headerKey: 'entities.contrato.columns.empleado', type: 'text' },
  {
    field: 'contrato_tipo_nombre',
    headerKey: 'entities.contrato.columns.contratoTipo',
    type: 'text',
  },
  { field: 'fecha_desde', headerKey: 'entities.contrato.columns.fechaDesde', type: 'date' },
  { field: 'fecha_hasta', headerKey: 'entities.contrato.columns.fechaHasta', type: 'date' },
  { field: 'grupo_nombre', headerKey: 'entities.contrato.columns.grupo', type: 'text' },
  {
    field: 'salario',
    headerKey: 'entities.contrato.columns.salario',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'estado_terminado',
    headerKey: 'entities.contrato.columns.terminado',
    type: 'boolean',
    width: '60px',
    align: 'center',
  },
];

export const CONTRATOS_FILTER_FIELDS: readonly FilterField[] = [
  { name: 'contacto_nombre', displayNameKey: 'entities.contrato.columns.empleado', type: 'string' },
  { name: 'fecha_desde', displayNameKey: 'entities.contrato.columns.fechaDesde', type: 'date' },
  { name: 'fecha_hasta', displayNameKey: 'entities.contrato.columns.fechaHasta', type: 'date' },
  { name: 'salario', displayNameKey: 'entities.contrato.columns.salario', type: 'number' },
  {
    name: 'estado_terminado',
    displayNameKey: 'entities.contrato.columns.terminado',
    type: 'boolean',
  },
];

export const CONTRATOS_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
  { id: 'view', labelKey: 'common.actions.view', iconClass: 'pi pi-eye', inline: true },
  { id: 'delete', labelKey: 'common.actions.delete', iconClass: 'pi pi-trash', severity: 'danger' },
];

export const CONTRATOS_PRIMARY_ACTION: ToolbarAction = {
  id: 'new',
  labelKey: 'common.actions.new',
  iconClass: 'pi pi-plus',
};

export const CONTRATOS_TRAILING_ACTIONS: readonly ToolbarAction[] = [
  {
    id: 'actions',
    labelKey: 'common.actions.actions',
    iconClass: '',
    children: [
      { id: 'import', labelKey: 'common.actions.import', iconClass: 'pi pi-upload' },
      { id: 'export-excel', labelKey: 'common.actions.exportExcel', iconClass: 'pi pi-file-excel' },
    ],
  },
];

/**
 * Maestros del diálogo de importación de contratos: los catálogos que el archivo
 * del contrato realmente necesita.
 *
 * El contrato referencia tipo de contrato, ciudades (de contrato y de labor), los
 * catálogos de seguridad social —tipo y subtipo de cotizante, entidades— y el tipo
 * de costo. El resto del catálogo (bancos, comprobantes, activos) no aparece en su
 * archivo, así que no se ofrece.
 */
export const CONTRATOS_IMPORT_MASTERS: readonly ImportMaster[] = IMPORT_MASTERS_ALL;
