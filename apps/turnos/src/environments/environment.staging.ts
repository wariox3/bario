import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: false,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAADSiAQzHQjzVDw1n',
  landingUrl: 'https://reddoc.uk',
  erpUrl: 'https://erp.reddoc.uk',
  cuentaUrl: 'https://cuenta.reddoc.uk',
};
