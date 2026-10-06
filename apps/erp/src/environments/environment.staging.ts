import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: true,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAADSiAQzHQjzVDw1n',
  landingUrl: 'https://reddoc.uk',
  cuentaUrl: 'https://cuenta.reddoc.uk',
  turnosUrl: 'https://turno.reddoc.uk',
};
