import type { Routes } from '@angular/router';

/**
 * Asistente de facturación electrónica — `/t/:slug/facturacion-electronica`.
 *
 * Feature tradicional, hermana de `configuracion` y `dashboard`: configura la
 * **empresa**, no un módulo, así que no vive dentro de Venta aunque hoy se
 * entre desde ahí. El paso activo viaja en `?paso=`, igual que el `?seccion=`
 * de Configuración.
 */
export const FACTURACION_ELECTRONICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/asistente/asistente.component').then((m) => m.AsistenteComponent),
  },
];
