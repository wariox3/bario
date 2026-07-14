import { Routes } from '@angular/router';
import { clearTenantGuard } from '@reddoc/core';
import type { ContenedoresCapabilities } from '@reddoc/feature-contenedores';

/** El ERP es donde se administran las empresas: todas las acciones habilitadas. */
const ERP_CONTENEDORES_CAPABILITIES: ContenedoresCapabilities = {
  create: true,
  edit: true,
  invite: true,
  delete: true,
  subscription: true,
  viewToggle: true,
};

export const CONTENEDORES_ROUTES: Routes = [
  {
    path: '',
    canActivate: [clearTenantGuard],
    data: { capabilities: ERP_CONTENEDORES_CAPABILITIES },
    loadComponent: () =>
      import('@reddoc/feature-contenedores').then((m) => m.ContenedoresListComponent),
  },
];
