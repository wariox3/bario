# Sentry — pendientes para activarlo

Contexto: el frontend ya reporta errores a Sentry en las 6 SPA (erp, cuenta, transporte, pos, turnos, cliente), **solo en producción**. Todo está cableado; Sentry queda apagado mientras el DSN esté vacío. El landing no está integrado (es SSR y se configura distinto). El backend (Django) ya usa Sentry por su cuenta.

Cómo está armado: ver la nota **Sentry (observabilidad)** en `CLAUDE.md` y el código en `libs/core/src/lib/observabilidad/`.

## 1. DSN del proyecto de frontend ❌ PENDIENTE

Pegar el DSN en **un solo lugar**: `libs/core/src/lib/observabilidad/sentry.config.ts`.

```ts
export const SENTRY_PRODUCCION: SentryConfig = {
  dsn: 'https://<clave>@<org>.ingest.sentry.io/<proyecto>',
  environment: 'production',
};
```

- Un solo proyecto de tipo **Angular** en Sentry para todas las apps; el tag `app` las separa.
- Conviene crearlo en la misma organización que el proyecto de Django, para cruzar eventos.
- El DSN no es un secreto (termina en el bundle del navegador): se commitea.

## 2. Source maps en el deploy ❌ PENDIENTE

Sin esto los errores llegan con el código minificado (`main-XXXX.js:1:48213`). El deploy funciona igual y deja un warning.

En GitHub → Settings:

| Qué                 | Dónde                               | Valor                                                       |
| ------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Secret del environment `production` | Token de organización con permiso de releases y source maps |
| `SENTRY_ORG`        | Variable del repo                   | Slug de la organización en Sentry                           |
| `SENTRY_PROJECT`    | Variable del repo                   | Slug del proyecto de frontend                               |

El paso `Upload source maps to Sentry` de `.github/workflows/deploy.yml` los sube y el siguiente los borra antes del rsync: nunca llegan al servidor.

## 3. Prueba de humo ❌ PENDIENTE

Antes de confiar en producción, probar en local:

1. En `apps/erp/src/environments/environment.ts` agregar **temporalmente**:

   ```ts
   sentry: { ...SENTRY_PRODUCCION, environment: 'development' },
   ```

   (importando `SENTRY_PRODUCCION` de `@reddoc/core`).

2. `npx nx serve erp`, entrar a un tenant y en la consola del navegador:

   ```js
   setTimeout(() => {
     throw new Error('Prueba de Sentry desde el ERP');
   });
   ```

3. En Sentry, el evento debe aparecer con los tags `app: erp`, `tenant: <slug>`, el id del usuario y el entorno `development`.
4. **Quitar** la línea de `environment.ts`. Dev y staging no reportan.

Tras el primer deploy a producción, revisar que un error muestre el archivo `.ts` y la línea (source maps funcionando).

## 4. Configuración dentro de Sentry ❌ PENDIENTE

- **Alertas**: por issue nuevo y por pico de eventos, a un canal del equipo. No una alerta por cada evento.
- **Filtro de entornos**: que las alertas miren solo `production`.
- **Inbound filters**: activar el filtro de extensiones del navegador y de crawlers.

## 5. Coordinar con backend ❌ PENDIENTE

- El `request_id` solo llega cuando el error viene en el sobre `{ success: false, error, request_id }` (`ApiErrorResponse`). Un 500 que Django responde en HTML llega a Sentry **sin** `request_id` y no se puede cruzar. Pedir que el handler de excepciones de DRF devuelva siempre ese sobre, también en 500.
- Confirmar que el Sentry de Django registra ese mismo `request_id` como tag, para buscarlo desde ambos lados.

## Qué reporta y qué no (referencia)

| Caso                                                      | Se reporta                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Error de JavaScript no atrapado                           | Sí, con tenant, app y usuario                                        |
| Respuesta 5xx del backend                                 | Sí, un issue por endpoint y status                                   |
| Respuesta 4xx (validación, permisos, no encontrado)       | No                                                                   |
| Sin conexión (status 0)                                   | No                                                                   |
| Chunk viejo tras un deploy                                | No: la página se recarga sola; si persiste, sí (`ChunkNoCargaError`) |
| Cuerpos, cabeceras, cookies, query params, correo, nombre | Nunca                                                                |

## Fuera de alcance por ahora

- Rendimiento (Web Vitals / tracing) y session replay: se decide después de ver el volumen de errores. Si se activa replay, con todo el texto y los inputs enmascarados.
- Landing (SSR).
