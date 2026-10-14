import { contenedoresEn } from '@reddoc/feature-contenedores/i18n';
import { accesosContenedorEn, appSwitcherEn, authEn, phoneInputEn } from '@reddoc/ui';
import type { AppDict } from './app.dict';

export const en: AppDict = {
  auth: authEn,
  appSwitcher: appSwitcherEn,
  phoneInput: phoneInputEn,
  contenedores: contenedoresEn,
  accesosContenedor: accesosContenedorEn,
  layout: {
    menuLabel: 'Open menu',
    drawerHeader: 'Menu',
    tenantBadge: {
      ariaLabel: 'Current company',
    },
    nav: {
      caja: 'Register',
      historial: 'History',
      configuracion: 'Settings',
    },
    userMenu: {
      label: 'User menu',
      myContainers: 'My containers',
      manageAccount: 'Manage account',
      settings: 'Settings',
      logout: 'Sign out',
    },
  },
  proximamente: {
    desc: 'This section is under construction.',
  },
};
