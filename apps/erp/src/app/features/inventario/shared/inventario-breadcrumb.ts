import type { BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';

/**
 * Migas para los documentos del módulo Inventario: `Inventario → <documento> → acción`.
 * Espeja `compraDocumentoBreadcrumb` con el segmento y nombre del módulo inventario.
 */
export function inventarioDocumentoBreadcrumb(
  t: AppDict,
  slug: string | null,
  entityLabel: string,
  entityListPath: string,
  actionLabel: string,
): readonly BreadcrumbItem[] {
  const inventarioBase = slug ? ['/t', slug, 'inventario'] : undefined;
  return [
    { label: t.modules.inventario.name, routerLink: inventarioBase },
    {
      label: entityLabel,
      routerLink: inventarioBase ? [...inventarioBase, entityListPath, 'list'] : undefined,
    },
    { label: actionLabel },
  ];
}
