import type { BreadcrumbItem } from '@reddoc/feature-base';
import type { ActiveModuleStore } from './active-module.store';
import { currentModuleId, resolveModuleName } from './active-module-nav';

/**
 * Migas **agnósticas de módulo** para documentos compartidos entre módulos:
 * `<módulo activo> → <documento> → acción`.
 *
 * Espeja `ventaDocumentoBreadcrumb` / `compraDocumentoBreadcrumb`, pero deriva
 * el segmento y el nombre del módulo del `ActiveModuleStore` en vez de fijarlos.
 * Úsala en los documentos enrutados desde más de un módulo (factura de venta y
 * factura de compra, que también cuelgan de General); los documentos exclusivos
 * de un módulo siguen con el helper de su módulo.
 */
export function documentoBreadcrumb(
  store: ActiveModuleStore,
  dict: unknown,
  slug: string | null,
  entityLabel: string,
  entityListPath: string,
  actionLabel: string,
): readonly BreadcrumbItem[] {
  const moduleBase = slug ? ['/t', slug, currentModuleId(store)] : undefined;
  return [
    { label: resolveModuleName(store, dict), routerLink: moduleBase },
    {
      label: entityLabel,
      routerLink: moduleBase ? [...moduleBase, entityListPath, 'list'] : undefined,
    },
    { label: actionLabel },
  ];
}
