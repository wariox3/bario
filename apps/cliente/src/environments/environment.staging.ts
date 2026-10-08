import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: false,
  apiUrl: '/api',
  turnstileSiteKey: 'REEMPLAZAR_STAGING',
  landingUrl: 'https://reddoc.uk',
};
