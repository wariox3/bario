/**
 * Entry point del componente. Importalo SOLO de forma dinámica (`loadComponent`):
 * un `import` estático desde `app.config.ts` o `app.routes.ts` colapsaría el
 * chunk contra el bundle inicial. El diccionario, que sí necesita cargarse
 * eager, vive aparte en `@reddoc/feature-contenedores/i18n`.
 */
export { ContenedoresListComponent } from './lib/pages/contenedores-list/contenedores-list.component';
export { CONTENEDORES_CAPABILITIES_FULL } from './lib/contenedores.capabilities';
export type { ContenedoresCapabilities } from './lib/contenedores.capabilities';
