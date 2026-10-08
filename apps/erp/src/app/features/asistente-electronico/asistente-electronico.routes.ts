import type { Routes } from '@angular/router';

/**
 * Asistente electrónico — `/t/:slug/facturacion-electronica` y
 * `/t/:slug/nomina-electronica`, con la variante en el `data` de cada ruta
 * (`app.routes.ts`); este `''` la hereda y llega como input al asistente.
 *
 * Feature tradicional, hermana de `configuracion` y `dashboard`: configura la
 * **empresa**, no un módulo, así que no vive dentro de Venta ni de Humano
 * aunque se entre desde ahí. El paso activo viaja en `?paso=`, igual que el `?seccion=`
 * de Configuración.
 */
export const ASISTENTE_ELECTRONICO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/asistente/asistente.component').then((m) => m.AsistenteComponent),
  },
];
