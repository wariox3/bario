import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TenantService } from '@reddoc/core';
import type { BreadcrumbItem } from '@reddoc/feature-base';
import { ROUTE_PATHS } from '../../core/constants/route-paths.constants';

/** Segmento del administrador de cajas, relativo al tenant. */
export const CAJA_SEGMENTO = 'caja';

export interface CajaNav {
  /** Navega dentro del master: `ir()` a la lista, `ir('nuevo')`, `ir('editar', id)`. */
  ir(...sub: readonly (string | number)[]): void;
  /**
   * Migas `Caja › <hijas…>`. Sin hijas, «Caja» es la página actual y no enlaza;
   * con hijas, enlaza a la lista.
   */
  crumbs(entidad: string, ...hijas: readonly BreadcrumbItem[]): readonly BreadcrumbItem[];
}

/**
 * Navegación del master de cajas: `/t/<slug>/caja[/…]`. El POS no tiene
 * módulos, así que es la versión corta del `masterNav` del ERP. Sin tenant
 * activo no hay a dónde ir dentro de la empresa y se vuelve a contenedores.
 */
export function cajaNav(): CajaNav {
  const router = inject(Router);
  const tenant = inject(TenantService);

  const link = (...sub: readonly (string | number)[]): (string | number)[] | undefined => {
    const slug = tenant.currentSlug();
    return slug ? ['/t', slug, CAJA_SEGMENTO, ...sub] : undefined;
  };

  return {
    ir: (...sub) => {
      const comandos = link(...sub);
      void router.navigate(comandos ?? [ROUTE_PATHS.contenedores.root]);
    },
    crumbs: (entidad, ...hijas) =>
      hijas.length === 0
        ? [{ label: entidad }]
        : [{ label: entidad, routerLink: link() }, ...hijas],
  };
}
