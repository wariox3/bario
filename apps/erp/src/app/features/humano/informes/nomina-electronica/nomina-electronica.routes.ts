import type { Route } from '@angular/router';

/**
 * Rutas del informe **Nómina electrónica** del módulo Humano.
 *
 * Informe de solo lectura: una única página de listado. El componente se carga
 * lazy para mantener su bundle separado del resto del módulo.
 *
 * La página deriva el módulo activo del `ActiveModuleStore`, así que se puede
 * montar desde otros módulos sin tocarla.
 *
 * URL: `/t/:tenantSlug/humano/informes/nomina-electronica`
 */
export const NOMINA_ELECTRONICA_INFORME_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/nomina-electronica-list/nomina-electronica-list.component').then(
        (m) => m.NominaElectronicaListComponent,
      ),
  },
];
