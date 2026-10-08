import type { Route } from '@angular/router';

/**
 * Rutas de **Saldo inicial** (Tesorería) — carcasa.
 *
 * De momento solo expone `list` apuntando a un shell vacío. Cuando se implemente
 * el documento (camino A), sumar aquí `nuevo`/`editar/:id`/`detalle/:id` con el
 * `activeDocumentResolver('saldo-inicial')` y registrar su config en
 * `TESORERIA_CONFIG`, igual que Egreso.
 *
 * URL: `/t/:tenantSlug/tesoreria/saldo-inicial/list`
 */
export const SALDO_INICIAL_ROUTES: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/saldo-inicial-list/saldo-inicial-list.component').then(
        (m) => m.SaldoInicialListComponent,
      ),
  },
];
