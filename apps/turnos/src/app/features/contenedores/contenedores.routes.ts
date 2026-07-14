import type { Route } from '@angular/router';
import { clearTenantGuard } from '@reddoc/core';
import type { ContenedoresCapabilities } from '@reddoc/feature-contenedores';

/**
 * Turnos administra contenedores igual que el ERP: las seis acciones habilitadas.
 *
 * Se escriben una por una en vez de reusar `CONTENEDORES_CAPABILITIES_FULL`: esa
 * constante es un valor del barrel `@reddoc/feature-contenedores`, e importarla
 * acá sería un import estático del lib, que es justo lo que colapsa su chunk lazy
 * contra el bundle inicial. `ContenedoresCapabilities` sí se puede traer porque
 * es un `import type` y TypeScript lo borra al compilar.
 */
const TURNOS_CONTENEDORES_CAPABILITIES: ContenedoresCapabilities = {
  create: true,
  edit: true,
  invite: true,
  delete: true,
  subscription: true,
  viewToggle: true,
};

export const CONTENEDORES_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [clearTenantGuard],
    data: { capabilities: TURNOS_CONTENEDORES_CAPABILITIES },
    loadComponent: () =>
      import('@reddoc/feature-contenedores').then((m) => m.ContenedoresListComponent),
  },
];
