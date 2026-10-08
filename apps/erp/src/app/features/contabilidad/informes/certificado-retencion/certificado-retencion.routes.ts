import type { Route } from '@angular/router';

/**
 * Rutas del informe **Certificado de retención** del módulo Contabilidad.
 *
 * Informe de solo lectura: una única página. El componente se carga lazy para
 * mantener su bundle separado del resto del módulo.
 *
 * URL: `/t/:tenantSlug/contabilidad/informes/certificado-retencion`
 */
export const CERTIFICADO_RETENCION_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/certificado-retencion/certificado-retencion.component').then(
        (m) => m.CertificadoRetencionComponent,
      ),
  },
];
