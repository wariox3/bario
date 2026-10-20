import type { RowAction } from '@reddoc/feature-base';

/** Única acción de fila de las tablas de cuentas y conceptos: editar. */
export const EDITAR_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
];

/** Alto del cuerpo de las tablas: van embebidas en una tarjeta, no llenan la página. */
export const HUMANO_TABLE_HEIGHT = '26rem';
