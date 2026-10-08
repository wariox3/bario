import { HttpErrorResponse } from '@angular/common/http';
import {
  EnvironmentProviders,
  ErrorHandler,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import * as Sentry from '@sentry/angular';
import { sincronizarContextoSentry } from './contexto-sentry';
import { MENSAJES_CHUNK_NO_CARGA, recargarAnteVersionNueva } from './recarga-por-version';
import { VERSION_FRONT } from './version';

/** Configuración de Sentry que declara cada `environment.<entorno>.ts`. */
export interface SentryConfig {
  readonly dsn: string;
  /** Nombre del entorno en Sentry: `development` | `staging` | `production`. */
  readonly environment: string;
}

export interface ObservabilidadOptions {
  /** App del monorepo que reporta (`erp`, `turnos`…). Va como tag en cada evento. */
  readonly app: string;
  /** Ausente o con DSN vacío = Sentry apagado. */
  readonly sentry?: SentryConfig;
}

/**
 * Arranca Sentry. Se llama en `main.ts` **antes** de `bootstrapApplication`,
 * para capturar también los errores del arranque de Angular.
 *
 * Sin DSN no hace nada: el SDK queda sin cliente y cualquier captura posterior
 * es un no-op.
 */
export function iniciarObservabilidad({ app, sentry }: ObservabilidadOptions): void {
  if (!sentry?.dsn) return;

  Sentry.init({
    dsn: sentry.dsn,
    environment: sentry.environment,
    // Misma versión que el changelog: "este error empezó en la 0.0.3". Los
    // source maps se asocian por debug id (deploy.yml), no por release.
    release: `reddoc-front@${VERSION_FRONT}`,
    // Los defaults del SDK recolectan cuerpos, cabeceras, cookies y query params:
    // en un ERP eso son montos, nóminas y documentos de terceros. Se apaga todo y
    // el usuario se identifica solo por su id (`sincronizarContextoSentry`).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    initialScope: { tags: { app } },
    // Los resuelve `recargarAnteVersionNueva`; si persisten tras recargar se
    // reportan como `ChunkNoCargaError`, con otro mensaje.
    ignoreErrors: [...MENSAJES_CHUNK_NO_CARGA],
    // HTTP lo reporta solo `observabilidadInterceptor` (5xx, agrupado por
    // endpoint). Un `HttpErrorResponse` que llegue por el ErrorHandler sería un
    // duplicado del 5xx o un 4xx que nadie atrapó: ruido.
    beforeSend: (event, hint) =>
      hint.originalException instanceof HttpErrorResponse ? null : event,
  });
}

/**
 * Lo que cada SPA suma a su `app.config.ts`:
 * - el `ErrorHandler` de Sentry (todo error que Angular atrape se reporta y
 *   sigue saliendo por consola),
 * - el contexto de tenant y usuario en cada evento,
 * - la recarga automática cuando un deploy dejó la pestaña con la versión vieja.
 *
 * Falta además `observabilidadInterceptor`, último en `withInterceptors`.
 */
export function provideObservabilidad(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler() },
    provideEnvironmentInitializer(() => {
      sincronizarContextoSentry();
      recargarAnteVersionNueva();
    }),
  ]);
}
