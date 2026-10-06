import type { Route } from '@angular/router';
import type { CarteraTipo } from '@erp/core/module-config';

/**
 * Rutas del proceso **Validar saldos**, montado por cada módulo con su cartera:
 * Cartera con `cobrar` y Tesorería con `pagar`. El `tipo` viaja en la `data` de
 * la ruta y llega al componente como input (`withComponentInputBinding`).
 *
 * El componente se carga lazy para mantener su bundle separado del módulo.
 *
 * URL: `/t/:tenantSlug/<cartera|tesoreria>/proceso/validar-saldos`
 */
export function validarSaldosRoutes(tipo: CarteraTipo): Route[] {
  return [
    {
      path: '',
      data: { tipo },
      loadComponent: () =>
        import('./pages/validar-saldos/validar-saldos.component').then(
          (m) => m.ValidarSaldosComponent,
        ),
    },
  ];
}
