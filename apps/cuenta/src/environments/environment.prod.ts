import { SENTRY_PRODUCCION, type ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: true,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAADn7-Pp__E0gDidF',
  landingUrl: 'https://reddoc2.co',
  wompiPublicKey: 'pub_prod_6Ox0LQlpRZCAatgO0JEwXWOv7FnfXgVN',
  wompiRedirectOrigin: 'https://cuenta.reddoc2.co',
  sentry: SENTRY_PRODUCCION,
};
