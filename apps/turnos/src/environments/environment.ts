import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: false,
  apiUrl: '/api',
  turnstileSiteKey: '1x00000000000000000000AA',
  landingUrl: 'http://localhost:4200',
  erpUrl: 'http://localhost:4201',
  cuentaUrl: 'http://localhost:4203',
};
