import type { Route } from '@angular/router';

/**
 * Rutas del master Periodo (camino B con UI especial). Vista única: gestión por
 * año (años a la izquierda, meses del año activo a la derecha). La creación de un
 * año nuevo es un diálogo dentro de esa vista, no una ruta aparte.
 */
export const PERIODO_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'anio' },
  {
    path: 'anio',
    loadComponent: () =>
      import('./pages/periodo-anio/periodo-anio.component').then((m) => m.PeriodoAnioComponent),
  },
];
