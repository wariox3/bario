import type { BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';

/**
 * Migas para los documentos del módulo Compra: `Compra → <documento> → acción`.
 * Espeja `ventaDocumentoBreadcrumb` con el segmento y nombre del módulo compra.
 */
export function compraDocumentoBreadcrumb(
  t: AppDict,
  slug: string | null,
  entityLabel: string,
  entityListPath: string,
  actionLabel: string,
): readonly BreadcrumbItem[] {
  const compraBase = slug ? ['/t', slug, 'compra'] : undefined;
  return [
    { label: t.modules.compra.name, routerLink: compraBase },
    {
      label: entityLabel,
      routerLink: compraBase ? [...compraBase, entityListPath, 'list'] : undefined,
    },
    { label: actionLabel },
  ];
}
