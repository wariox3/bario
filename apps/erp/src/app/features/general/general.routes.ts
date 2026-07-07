import type { Route } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { GENERAL_MODULE } from './general.module-descriptor';

/**
 * Rutas del módulo General.
 *
 * Resuelve `erpModuleResolver('general')` en la ruta raíz para que el topbar
 * y el sidebar se sincronicen al activar este módulo. Delega cada master a
 * su propio archivo de rutas dentro de `masters/<entity>/<entity>.routes.ts`
 * — cada master es un bounded context auto-contenido (modelo, servicio,
 * páginas, componentes y utilidades específicas viven juntos).
 *
 * Camino B del enfoque híbrido (ver docs/architecture/erp-module-architecture.md).
 */
export const GENERAL_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('general') },
    children: [
      moduleIndexRoute(GENERAL_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        // Reusa el placeholder compartido; reemplazar por un inicio propio
        // (como turno) cuando exista su endpoint de analítica.
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'contactos',
        loadChildren: () =>
          import('./masters/contacto/contacto.routes').then((m) => m.CONTACTO_ROUTES),
      },
      {
        path: 'items',
        loadChildren: () => import('./masters/item/item.routes').then((m) => m.ITEM_ROUTES),
      },
      {
        path: 'asesores',
        loadChildren: () => import('./masters/asesor/asesor.routes').then((m) => m.ASESOR_ROUTES),
      },
      {
        path: 'cuentas-banco',
        loadChildren: () =>
          import('./masters/cuenta-banco/cuenta-banco.routes').then((m) => m.CUENTA_BANCO_ROUTES),
      },
      {
        path: 'precios',
        loadChildren: () => import('./masters/precio/precio.routes').then((m) => m.PRECIO_ROUTES),
      },
      {
        path: 'sedes',
        loadChildren: () => import('./masters/sede/sede.routes').then((m) => m.SEDE_ROUTES),
      },
      // Futuros: almacenes, formas-pago, resoluciones.
      // Cada uno delega a su `masters/<entity>/<entity>.routes.ts`.
    ],
  },
];
