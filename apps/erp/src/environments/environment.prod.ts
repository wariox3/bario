import { SENTRY_PRODUCCION, type ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: true,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAADn7-Pp__E0gDidF',
  landingUrl: 'https://reddoc.co',
  cuentaUrl: 'https://cuenta.reddoc.co',
  turnosUrl: 'https://turnos.reddoc.co',
  posUrl: 'https://pos.reddoc.co',
  sentry: SENTRY_PRODUCCION,
};
