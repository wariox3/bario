import type { Route } from '@angular/router';

/**
 * Rutas de **Saldo inicial** (Cartera — CxC, `documento_tipo_id 18`) — carcasa.
 *
 * De momento solo expone `list` apuntando a un shell vacío, en paralelo a la
 * carcasa de Tesorería (Saldo inicial CxP, tipo 19). Cuando se implemente el
 * documento (camino A), sumar aquí `nuevo`/`editar/:id`/`detalle/:id` con el
 * `activeDocumentResolver('saldo-inicial')` y registrar su config en
 * `CARTERA_CONFIG`, igual que Pago.
 *
 * URL: `/t/:tenantSlug/cartera/saldo-inicial/list`
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
