import type { Route } from '@angular/router';

/**
 * Rutas del área de turnos.
 *
 * En la app standalone `turnos` estas rutas cuelgan directamente del tenant
 * (`/t/:slug/...`), sin segmento de módulo. Delega cada master a su propio
 * archivo de rutas dentro de `masters/<entity>/<entity>.routes.ts` — cada master
 * es un bounded context auto-contenido (modelo, servicio, páginas y utilidades
 * específicas viven juntos).
 */
export const TURNO_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./inicio/turno-inicio.component').then((m) => m.TurnoInicioComponent),
  },
  {
    path: 'soportes',
    loadChildren: () =>
      import('./movimientos/soporte/soporte.routes').then((m) => m.SOPORTE_ROUTES),
  },
  {
    path: 'programaciones',
    loadChildren: () =>
      import('./movimientos/programacion/programacion.routes').then((m) => m.PROGRAMACION_ROUTES),
  },
  {
    path: 'puestos',
    loadChildren: () => import('./masters/puesto/puesto.routes').then((m) => m.PUESTO_ROUTES),
  },
  {
    path: 'programadores',
    loadChildren: () =>
      import('./masters/programador/programador.routes').then((m) => m.PROGRAMADOR_ROUTES),
  },
  {
    path: 'secuencias',
    loadChildren: () =>
      import('./masters/secuencia/secuencia.routes').then((m) => m.SECUENCIA_ROUTES),
  },
  {
    path: 'prototipos',
    loadChildren: () =>
      import('./masters/prototipo/prototipo.routes').then((m) => m.PROTOTIPO_ROUTES),
  },
  {
    path: 'turnos',
    loadChildren: () => import('./masters/turno/turno.routes').then((m) => m.TURNO_MASTER_ROUTES),
  },
  {
    path: 'proceso/regenerar-horas',
    loadChildren: () =>
      import('./proceso/regenerar-horas/regenerar-horas.routes').then(
        (m) => m.REGENERAR_HORAS_ROUTES,
      ),
  },
];
