import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TenantService } from '@reddoc/core';
import type { BreadcrumbItem } from '@reddoc/feature-base';
import { ROUTE_PATHS } from '../../core/constants/route-paths.constants';

/** Segmento de turnos, relativo al tenant. */
export const TURNO_SEGMENTO = 'turno';

export interface TurnoNav {
  /** `ir()` a la lista, `ir('detalle', id)` a la ficha. */
  ir(...sub: readonly (string | number)[]): void;
  /** Migas `Turno › <hijas…>`; con hijas, «Turno» enlaza a la lista. */
  crumbs(entidad: string, ...hijas: readonly BreadcrumbItem[]): readonly BreadcrumbItem[];
}

/** Navegación de turnos: `/t/<slug>/turno[/…]`. Sin tenant activo vuelve a contenedores. */
export function turnoNav(): TurnoNav {
  const router = inject(Router);
  const tenant = inject(TenantService);

  const link = (...sub: readonly (string | number)[]): (string | number)[] | undefined => {
    const slug = tenant.currentSlug();
    return slug ? ['/t', slug, TURNO_SEGMENTO, ...sub] : undefined;
  };

  return {
    ir: (...sub) => void router.navigate(link(...sub) ?? [ROUTE_PATHS.contenedores.root]),
    crumbs: (entidad, ...hijas) =>
      hijas.length === 0
        ? [{ label: entidad }]
        : [{ label: entidad, routerLink: link() }, ...hijas],
  };
}
