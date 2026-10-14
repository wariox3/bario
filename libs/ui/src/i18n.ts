/**
 * Entry point de los diccionarios de `@reddoc/ui`.
 *
 * `provideI18n` recibe un objeto estático, así que cada `app.es.ts` importa estos
 * diccionarios eager. Desde el barrel arrastraban sus componentes al bundle
 * inicial; desde aquí entran solo los textos. Mismo motivo que
 * `@reddoc/feature-contenedores/i18n`.
 */
export type { AuthDict, AuthTranslationsHost } from './lib/auth/i18n';
export { authEs, authEn } from './lib/auth/i18n';
export type {
  AccesosContenedorDict,
  AccesosContenedorTranslationsHost,
} from './lib/components/accesos-contenedor/i18n';
export { accesosContenedorEs, accesosContenedorEn } from './lib/components/accesos-contenedor/i18n';
export type { PhoneInputDict, PhoneInputTranslationsHost } from './lib/components/phone-input/i18n';
export { phoneInputEs, phoneInputEn } from './lib/components/phone-input/i18n';
export type { AppSwitcherDict, AppSwitcherTranslationsHost } from './lib/app-switcher/i18n';
export { appSwitcherEs, appSwitcherEn } from './lib/app-switcher/i18n';
