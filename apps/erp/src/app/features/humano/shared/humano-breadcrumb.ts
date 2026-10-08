import type { BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';

/**
 * Migas para los documentos del módulo Humano: `Humano → <documento> → acción`.
 * Espeja `inventarioDocumentoBreadcrumb` con el segmento y nombre de humano.
 */
export function humanoDocumentoBreadcrumb(
  t: AppDict,
  slug: string | null,
  entityLabel: string,
  entityListPath: string,
  actionLabel: string,
): readonly BreadcrumbItem[] {
  const humanoBase = slug ? ['/t', slug, 'humano'] : undefined;
  return [
    { label: t.modules.humano.name, routerLink: humanoBase },
    {
      label: entityLabel,
      routerLink: humanoBase ? [...humanoBase, entityListPath, 'list'] : undefined,
    },
    { label: actionLabel },
  ];
}
