import type { Route } from '@angular/router';
import { MODELO, withPermission } from '@erp/core/permissions';
import { erpModuleResolver, moduleIndexRoute } from '@erp/core/erp-modules';
import { activeModuleResolver } from '@erp/core/module-config';
import { HUMANO_MODULE } from './humano.module-descriptor';

export const HUMANO_ROUTES: Route[] = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('humano'), // topbar + sidebar
      _docModule: activeModuleResolver('humano'), // carga HUMANO_CONFIG
    },
    children: [
      moduleIndexRoute(HUMANO_MODULE),
      {
        // Inicio del módulo (vacío por ahora — sin endpoints de estadísticas).
        path: 'inicio',
        loadComponent: () =>
          import('@erp/layouts/module-placeholder/module-placeholder.component').then(
            (m) => m.ModulePlaceholderComponent,
          ),
      },
      {
        path: 'nomina',
        loadChildren: () =>
          import('./documentos/nomina/nomina.routes').then((m) => m.NOMINA_ROUTES),
      },
      {
        path: 'nomina-electronica',
        loadChildren: () =>
          import('./documentos/nomina-electronica/nomina-electronica.routes').then(
            (m) => m.NOMINA_ELECTRONICA_ROUTES,
          ),
      },
      {
        path: 'seguridad-social',
        loadChildren: () =>
          import('./documentos/seguridad-social/seguridad-social.routes').then(
            (m) => m.SEGURIDAD_SOCIAL_ROUTES,
          ),
      },
      {
        path: 'proceso/programacion',
        loadChildren: () =>
          import('./proceso/programacion/programacion.routes').then((m) => m.PROGRAMACION_ROUTES),
      },
      {
        path: 'proceso/aporte',
        loadChildren: () => import('./proceso/aporte/aporte.routes').then((m) => m.APORTE_ROUTES),
      },
      {
        path: 'proceso/liquidacion',
        loadChildren: () =>
          import('./proceso/liquidacion/liquidacion.routes').then((m) => m.LIQUIDACION_ROUTES),
      },
      {
        path: 'utilidades/enviar-nomina-electronica',
        loadChildren: () =>
          import('./utilidades/enviar-nomina-electronica/enviar-nomina-electronica.routes').then(
            (m) => m.ENVIAR_NOMINA_ELECTRONICA_ROUTES,
          ),
      },
      {
        path: 'informes/nomina',
        loadChildren: () =>
          import('./informes/nomina/nomina.routes').then((m) => m.NOMINA_INFORME_ROUTES),
      },
      {
        path: 'informes/nomina-detalle',
        loadChildren: () =>
          import('./informes/nomina-detalle/nomina-detalle.routes').then(
            (m) => m.NOMINA_DETALLE_INFORME_ROUTES,
          ),
      },
      {
        path: 'informes/nomina-electronica',
        loadChildren: () =>
          import('./informes/nomina-electronica/nomina-electronica.routes').then(
            (m) => m.NOMINA_ELECTRONICA_INFORME_ROUTES,
          ),
      },
      // Empleados no tiene servicio propio: usa `ContactoService`, así que lo
      // gobierna el mismo modelo que Contactos.
      ...withPermission(MODELO.general.contacto, {
        path: 'empleados',
        loadChildren: () =>
          import('./masters/empleado/empleado.routes').then((m) => m.EMPLEADO_ROUTES),
      }),
      ...withPermission(MODELO.humano.contrato, {
        path: 'contratos',
        loadChildren: () =>
          import('./masters/contrato/contrato.routes').then((m) => m.CONTRATO_ROUTES),
      }),
      ...withPermission(MODELO.humano.credito, {
        path: 'creditos',
        loadChildren: () =>
          import('./masters/credito/credito.routes').then((m) => m.CREDITO_ROUTES),
      }),
      ...withPermission(MODELO.humano.adicional, {
        path: 'adicionales',
        loadChildren: () =>
          import('./masters/adicional/adicional.routes').then((m) => m.ADICIONAL_ROUTES),
      }),
      ...withPermission(MODELO.humano.novedad, {
        path: 'novedades',
        loadChildren: () =>
          import('./masters/novedad/novedad.routes').then((m) => m.NOVEDAD_ROUTES),
      }),
      ...withPermission(MODELO.humano.cargo, {
        path: 'cargos',
        loadChildren: () => import('./masters/cargo/cargo.routes').then((m) => m.CARGO_ROUTES),
      }),
      ...withPermission(MODELO.humano.grupo, {
        path: 'grupos',
        loadChildren: () => import('./masters/grupo/grupo.routes').then((m) => m.GRUPO_ROUTES),
      }),
      ...withPermission(MODELO.humano.sucursal, {
        path: 'sucursales',
        loadChildren: () =>
          import('./masters/sucursal/sucursal.routes').then((m) => m.SUCURSAL_ROUTES),
      }),
    ],
  },
];
