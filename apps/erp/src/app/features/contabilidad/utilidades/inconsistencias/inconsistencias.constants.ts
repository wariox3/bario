import type { RowAction } from '@reddoc/feature-base';
import type { InconsistenciaGuardada } from '@erp/features/contabilidad/shared/inconsistencia/inconsistencia.model';

const I18N = 'entities.inconsistencias';

export const ACCION_RESOLVER = 'resolver';

/**
 * Resolver va a la vista, no al menú: es lo único que se hace con una fila, y
 * solo aparece en las que el backend sabe corregir solo.
 */
export const ROW_ACTIONS: readonly RowAction[] = [
  {
    id: ACCION_RESOLVER,
    labelKey: `${I18N}.resolver.accion`,
    iconClass: 'pi pi-wrench',
    inline: true,
    visibleFor: (row) => (row as InconsistenciaGuardada).inconsistencia_tipo_resolver_automatico,
  },
];
