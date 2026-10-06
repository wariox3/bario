import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: false,
  apiUrl: '/api',
  turnstileSiteKey: '1x00000000000000000000AA',
  landingUrl: 'http://localhost:4200',
  wompiPublicKey: 'pub_test_HrxfoMdxFQFlRQ5be2n0jplrqpAViOKb',
  wompiRedirectOrigin: 'https://app.reddoc.uk',
};
