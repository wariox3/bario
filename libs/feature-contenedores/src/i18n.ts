/**
 * Entry point del diccionario. Separado de `index.ts` a propósito: `provideI18n`
 * recibe un objeto estático, así que cada `app.es.ts` importa esto de forma
 * eager. Si viviera en el barrel principal arrastraría el componente (y PrimeNG)
 * al bundle inicial.
 */
export type { ContenedoresDict, ContenedoresTranslationsHost } from './lib/i18n/contenedores.dict';
export { contenedoresEs } from './lib/i18n/contenedores.es';
export { contenedoresEn } from './lib/i18n/contenedores.en';
