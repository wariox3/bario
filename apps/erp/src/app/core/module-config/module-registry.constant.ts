import type { ModuleRegistry } from './module-registry.token';

/**
 * Registro central de módulos con **documentos transaccionales** del framework
 * configuracional (camino A del enfoque híbrido — ver docs/architecture).
 *
 * **Solo aplica a documentos** sobre el endpoint genérico `/api/general/documento`.
 * Los masters administrativos (contactos, ítems, sedes, etc.) NO entran aquí:
 * son features directos (camino B) con sus propias rutas y servicios.
 *
 * Para agregar un módulo con documentos:
 *   1. Crear `apps/erp/src/app/features/<id>/<id>.config.ts` que exporte
 *      una constante `<ID>_CONFIG: ModuleConfig` con sus documentos.
 *   2. Agregar una entrada aquí — cero modificaciones a otros archivos.
 *   3. Asegurar que `app.routes.ts` cargue lazy el módulo bajo `/t/:slug/<id>`.
 *   4. Sumar el acordeón al `menu` del `<id>.module-descriptor.ts`.
 */
export const ERP_MODULE_REGISTRY = {
  general: () => import('../../features/general/general.config').then((m) => m.GENERAL_CONFIG),
  venta: () => import('../../features/venta/venta.config').then((m) => m.VENTA_CONFIG),
  compra: () => import('../../features/compra/compra.config').then((m) => m.COMPRA_CONFIG),
  cartera: () => import('../../features/cartera/cartera.config').then((m) => m.CARTERA_CONFIG),
  tesoreria: () =>
    import('../../features/tesoreria/tesoreria.config').then((m) => m.TESORERIA_CONFIG),
  inventario: () =>
    import('../../features/inventario/inventario.config').then((m) => m.INVENTARIO_CONFIG),
} as const satisfies ModuleRegistry;

/**
 * Tipo derivado del registry. Garantiza que ningún string huérfano
 * pueda referenciar un módulo inexistente desde código tipado.
 */
export type ErpModuleId = keyof typeof ERP_MODULE_REGISTRY;
