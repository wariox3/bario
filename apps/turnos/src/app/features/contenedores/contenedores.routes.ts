import type { Route } from '@angular/router';
import type { ContenedoresCapabilities } from '@reddoc/feature-contenedores';

/**
 * Turnos puede elegir empresa, crear una nueva y alternar la vista. Editar,
 * invitar y eliminar siguen siendo exclusivos del ERP.
 *
 * `subscription` queda en `true` a propósito: si el propietario entra con la
 * suscripción vencida, `enterContenedor` le bloquea el paso, y sin ese botón no
 * tendría cómo llegar a cuenta a renovar.
 */
const TURNOS_CONTENEDORES_CAPABILITIES: ContenedoresCapabilities = {
  create: true,
  edit: false,
  invite: false,
  delete: false,
  subscription: true,
  viewToggle: true,
};

export const CONTENEDORES_ROUTES: Route[] = [
  {
    path: '',
    data: { capabilities: TURNOS_CONTENEDORES_CAPABILITIES },
    loadComponent: () =>
      import('@reddoc/feature-contenedores').then((m) => m.ContenedoresListComponent),
  },
];
