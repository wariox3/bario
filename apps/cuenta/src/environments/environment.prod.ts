import { SENTRY_PRODUCCION, type ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: true,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAAGNy9XOEJpOisnrx',
  landingUrl: 'https://reddoc.co',
  wompiPublicKey: 'pub_prod_6Ox0LQlpRZCAatgO0JEwXWOv7FnfXgVN',
  wompiRedirectOrigin: 'https://cuenta.reddoc.co',
  sentry: SENTRY_PRODUCCION,
};
