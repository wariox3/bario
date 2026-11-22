import { SENTRY_PRODUCCION, type ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: true,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAAGNy9XOEJpOisnrx',
  landingUrl: 'https://reddoc.co',
  erpUrl: 'https://app.reddoc.co',
  cuentaUrl: 'https://cuenta.reddoc.co',
  posUrl: 'https://pos.reddoc.co',
  sentry: SENTRY_PRODUCCION,
};
