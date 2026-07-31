import { CARTERA_MODULE } from '@erp/features/cartera/cartera.module-descriptor';
import { COMPRA_MODULE } from '@erp/features/compra/compra.module-descriptor';
import { CONTABILIDAD_MODULE } from '@erp/features/contabilidad/contabilidad.module-descriptor';
import { TESORERIA_MODULE } from '@erp/features/tesoreria/tesoreria.module-descriptor';
import { GENERAL_MODULE } from '@erp/features/general/general.module-descriptor';
import { HUMANO_MODULE } from '@erp/features/humano/humano.module-descriptor';
import { INVENTARIO_MODULE } from '@erp/features/inventario/inventario.module-descriptor';
import { VENTA_MODULE } from '@erp/features/venta/venta.module-descriptor';
import type { ErpModuleDescriptor } from './erp-module.types';

/**
 * Módulos del ERP en orden de aparición en el topbar.
 *
 * Import estático: son descriptores pequeños sin componentes, no justifica
 * lazy loading. Las páginas siguen siendo lazy vía `loadComponent` desde sus
 * `<modulo>.routes.ts`.
 */
export const ERP_MODULES: readonly ErpModuleDescriptor[] = [
  GENERAL_MODULE,
  VENTA_MODULE,
  COMPRA_MODULE,
  TESORERIA_MODULE,
  CARTERA_MODULE,
  INVENTARIO_MODULE,
  HUMANO_MODULE,
  CONTABILIDAD_MODULE,
] as const;
