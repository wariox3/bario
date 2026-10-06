import type { ReddocEnvironment } from '@reddoc/core';

export const environment: ReddocEnvironment & { production: boolean } = {
  production: false,
  apiUrl: '/api',
  turnstileSiteKey: '0x4AAAAAADSiAQzHQjzVDw1n',
  landingUrl: 'https://reddoc.uk',
  wompiPublicKey: 'pub_test_HrxfoMdxFQFlRQ5be2n0jplrqpAViOKb',
  wompiRedirectOrigin: '',
};
