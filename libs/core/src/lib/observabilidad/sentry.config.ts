import type { SentryConfig } from './observabilidad';

/**
 * Sentry de producción, compartido por todas las SPA: un solo proyecto de
 * frontend en Sentry, y cada evento lleva el tag `app` para separarlas.
 *
 * Es el único lugar donde va el DSN. Vacío = Sentry apagado. El DSN no es un
 * secreto: termina en el bundle que descarga el navegador.
 */
export const SENTRY_PRODUCCION: SentryConfig = {
  dsn: '',
  environment: 'production',
};
