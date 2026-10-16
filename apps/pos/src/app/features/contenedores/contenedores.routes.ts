import type { Route } from '@angular/router';
import { clearTenantGuard } from '@reddoc/core';
import type { ContenedoresCapabilities } from '@reddoc/feature-contenedores';

/**
 * En el POS la pantalla de contenedores sirve para **entrar** a la empresa
 * donde se vende, como en el POS anterior: crear, editar, invitar, eliminar y
 * suscripción se administran desde el ERP. Se conserva salir de una empresa y
 * alternar la vista.
 *
 * Se escriben una por una en vez de reusar `CONTENEDORES_CAPABILITIES_FULL`: esa
 * constante es un valor del barrel `@reddoc/feature-contenedores`, e importarla
 * acá sería un import estático del lib, que colapsa su chunk lazy contra el
 * bundle inicial. `ContenedoresCapabilities` es `import type` y se borra al
 * compilar.
 */
const POS_CONTENEDORES_CAPABILITIES: ContenedoresCapabilities = {
  create: false,
  edit: false,
  invite: false,
  delete: false,
  leave: true,
  subscription: false,
  viewToggle: true,
  support: true,
};

export const CONTENEDORES_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [clearTenantGuard],
    data: { capabilities: POS_CONTENEDORES_CAPABILITIES },
    loadComponent: () =>
      import('@reddoc/feature-contenedores').then((m) => m.ContenedoresListComponent),
  },
];
