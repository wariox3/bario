import type { ContenedoresTranslationsHost } from '@reddoc/feature-contenedores/i18n';
import type {
  AccesosContenedorTranslationsHost,
  AppSwitcherTranslationsHost,
  AuthTranslationsHost,
  PhoneInputTranslationsHost,
} from '@reddoc/ui';
import type { PosNavKey } from '../layouts/workspace-layout/workspace-menu';

/**
 * Diccionario del POS. Hereda los bloques que traen los libs compartidos (auth,
 * app-switcher, contenedores…) y suma solo lo propio de la app.
 */
export interface AppDict
  extends
    AuthTranslationsHost,
    AppSwitcherTranslationsHost,
    PhoneInputTranslationsHost,
    ContenedoresTranslationsHost,
    AccesosContenedorTranslationsHost {
  layout: {
    menuLabel: string;
    drawerHeader: string;
    tenantBadge: {
      ariaLabel: string;
    };
    /** Etiqueta de cada sección del sidebar; las claves salen de `WORKSPACE_MENU`. */
    nav: Record<PosNavKey, string>;
    userMenu: {
      label: string;
      myContainers: string;
      manageAccount: string;
      settings: string;
      logout: string;
    };
  };
  /** Pantalla de las secciones que todavía no están construidas. */
  proximamente: {
    desc: string;
  };
}
