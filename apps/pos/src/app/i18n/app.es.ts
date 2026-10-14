import { contenedoresEs } from '@reddoc/feature-contenedores/i18n';
import { accesosContenedorEs, appSwitcherEs, authEs, phoneInputEs } from '@reddoc/ui';
import type { AppDict } from './app.dict';

export const es: AppDict = {
  auth: authEs,
  appSwitcher: appSwitcherEs,
  phoneInput: phoneInputEs,
  contenedores: contenedoresEs,
  accesosContenedor: accesosContenedorEs,
  layout: {
    menuLabel: 'Abrir menú',
    drawerHeader: 'Menú',
    tenantBadge: {
      ariaLabel: 'Empresa actual',
    },
    nav: {
      caja: 'Caja',
      historial: 'Historial',
      configuracion: 'Configuración',
    },
    userMenu: {
      label: 'Menú de usuario',
      myContainers: 'Mis contenedores',
      manageAccount: 'Gestionar cuenta',
      settings: 'Configuración',
      logout: 'Cerrar sesión',
    },
  },
  proximamente: {
    desc: 'Esta sección está en construcción.',
  },
};
