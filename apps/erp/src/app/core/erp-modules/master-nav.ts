import { type Signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import type { BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore } from './active-module.store';
import { currentModuleId, resolveModuleName } from './active-module-nav';

/** Navegar sin tenant activo es un bug de arranque, no un caso de la UI. */
export class SinTenantActivoError extends Error {
  constructor(segmento: string) {
    super(`No se puede navegar a "${segmento}" sin un tenant activo.`);
    this.name = 'SinTenantActivoError';
  }
}

/** Navegación y migas de un master, siempre dentro del módulo activo. */
export interface MasterNav {
  /** Módulo por el que se entró; `general` si no hay ninguno activo. */
  readonly moduloId: Signal<string>;
  /** Navega dentro del master: `ir()` a la lista, `ir('nuevo')`, `ir('editar', id)`. */
  ir(...sub: readonly (string | number)[]): void;
  /** Lo mismo pero como comandos para `routerLink`; `undefined` sin tenant. */
  link(...sub: readonly (string | number)[]): (string | number)[] | undefined;
  /**
   * Migas `<módulo> › <entidad> › <hijas…>`.
   *
   * Sin hijas, la entidad es el final del camino y no enlaza (página de lista);
   * con hijas, enlaza a la lista (formulario y detalle). Es la misma regla que
   * las páginas escribían a mano, ahora en un solo lugar.
   */
  crumbs(entidad: string, ...hijas: readonly BreadcrumbItem[]): readonly BreadcrumbItem[];
}

/**
 * Navegación de un master **agnóstica del módulo**.
 *
 * Un master se monta desde varios módulos (`masters-compartidos.routes.ts`:
 * contactos desde seis, almacenes desde tres), así que el segmento de módulo de
 * su URL es **contexto, no identidad**: lo decide desde dónde entró el usuario,
 * y sale del `ActiveModuleStore` que fija el `erpModuleResolver` de la ruta raíz
 * de cada módulo. Un master que lo escribe a mano —`['general', 'sedes']`—
 * expulsa del módulo a quien entró por otro lado, y su breadcrumb miente.
 *
 * Se llama en un **field initializer** del componente: usa `inject`.
 *
 * ```ts
 * private readonly nav = masterNav('sedes');
 *
 * protected readonly breadcrumbItems = computed(() =>
 *   this.nav.crumbs(this.t().entities.sede.name),
 * );
 *
 * protected onNew(): void {
 *   this.nav.ir('nuevo');
 * }
 * ```
 *
 * El único argumento es el **segmento de la entidad** (`'sedes'`), el mismo que
 * declara la ruta del master. Que el módulo no se pueda escribir acá es el
 * punto: es lo que hace que no se pueda clavar.
 */
export function masterNav(segmento: string): MasterNav {
  const router = inject(Router);
  const tenant = inject(TenantService);
  const store = inject(ActiveModuleStore);
  const i18n = inject(I18nService);

  const moduloId = computed(() => currentModuleId(store));

  /** Raíz del módulo activo: `/t/<slug>/<módulo>`. `undefined` sin tenant. */
  const baseModulo = (): (string | number)[] | undefined => {
    const slug = tenant.currentSlug();
    return slug ? ['/t', slug, moduloId()] : undefined;
  };

  const link = (...sub: readonly (string | number)[]): (string | number)[] | undefined => {
    const base = baseModulo();
    return base ? [...base, segmento, ...sub] : undefined;
  };

  return {
    moduloId,
    ir: (...sub) => {
      const comandos = link(...sub);
      if (!comandos) throw new SinTenantActivoError(segmento);
      void router.navigate(comandos);
    },
    link,
    crumbs: (entidad, ...hijas) => [
      { label: resolveModuleName(store, i18n.t()), routerLink: baseModulo() },
      { label: entidad, routerLink: hijas.length > 0 ? link() : undefined },
      ...hijas,
    ],
  };
}
