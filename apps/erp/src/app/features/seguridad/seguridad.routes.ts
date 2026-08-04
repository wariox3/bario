import type { Routes } from '@angular/router';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { SEGURIDAD_MODULE } from './seguridad.module-descriptor';

/**
 * Rutas de Seguridad del contenedor (`/t/:slug/seguridad`).
 *
 * Se enruta como un módulo: el `erpModuleResolver` la marca como área activa y
 * el sidebar del workspace pinta sus secciones. Por eso no hay shell propio —
 * el chrome lo pone el layout, igual que en Venta o Inventario.
 *
 * Sumar una sección = una entrada en el `menu` del descriptor + una ruta hija
 * acá.
 */
export const SEGURIDAD_ROUTES: Routes = [
  {
    path: '',
    resolve: { _module: erpModuleResolver(SEGURIDAD_MODULE.id) },
    children: [
      moduleIndexRoute(SEGURIDAD_MODULE),
      {
        // Inicio vacío por ahora: mismo placeholder que estrenan los módulos
        // hasta que tienen su propio panel.
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'usuarios',
        loadChildren: () =>
          import('./sections/usuarios/usuarios.routes').then((m) => m.SEGURIDAD_USUARIOS_ROUTES),
      },
    ],
  },
];
