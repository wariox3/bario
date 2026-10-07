# Sentry — pendientes

Contexto: el frontend ya reporta errores a Sentry en las 6 SPA (erp, cuenta, transporte, pos, turnos, cliente), **solo en producción**. El DSN ya está puesto: en cuanto esto llega a producción, Sentry recibe errores reales. El landing no está integrado (es SSR y se configura distinto). El backend (Django) ya usa Sentry por su cuenta.

Cómo está armado: ver la nota **Sentry (observabilidad)** en `CLAUDE.md` y el código en `libs/core/src/lib/observabilidad/`.

## 1. DSN del proyecto de frontend ✅ HECHO

Vive en **un solo lugar**: `libs/core/src/lib/observabilidad/sentry.config.ts`. Vaciarlo apaga Sentry en todas las apps.

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

## 3. Prueba de humo ✅ HECHA (2026-10-06)

El error lanzado desde el ERP en local llegó a Sentry con sus tags. Para repetirla:

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

Si el envío no sale, mirar la pestaña Network filtrando por `envelope`: un bloqueador de anuncios (uBlock Origin lo bloqueó en la prueba) corta la petición a `*.sentry.io`. Desactivarlo para `localhost` o ver el punto 6. Si la petición da 200 y el evento no aparece, revisar en Sentry el inbound filter de _localhost_.

❌ PENDIENTE: tras el primer deploy a producción, revisar que un error muestre el archivo `.ts` y la línea (source maps funcionando).

## 4. Configuración dentro de Sentry ❌ PENDIENTE

- **Alertas**: por issue nuevo y por pico de eventos, a un canal del equipo. No una alerta por cada evento.
- **Filtro de entornos**: que las alertas miren solo `production`.
- **Inbound filters**: activar el filtro de extensiones del navegador y de crawlers.

## 5. Coordinar con backend ❌ PENDIENTE

- El `request_id` solo llega cuando el error viene en el sobre `{ success: false, error, request_id }` (`ApiErrorResponse`). Un 500 que Django responde en HTML llega a Sentry **sin** `request_id` y no se puede cruzar. Pedir que el handler de excepciones de DRF devuelva siempre ese sobre, también en 500.
- Confirmar que el Sentry de Django registra ese mismo `request_id` como tag, para buscarlo desde ambos lados.

## 6. Túnel contra bloqueadores de anuncios ❌ PENDIENTE (evaluar)

uBlock Origin, AdBlock y Brave bloquean `*.sentry.io` por defecto: los errores de un cliente con bloqueador **no llegan**. Antes de hacerlo, medir cuánto se pierde en la práctica.

La solución estándar es que el SDK envíe a una ruta del propio dominio y el servidor la reenvíe a Sentry; al ser el mismo dominio de la app, los bloqueadores no la reconocen.

- **Front** (una línea en `iniciarObservabilidad`): `tunnel: '/api/monitoreo'`.
- **Servidor** (quien administre nginx o Django): reenviar `POST /api/monitoreo` a `https://o4511552584744960.ingest.us.sentry.io/api/4512211479691264/envelope/`. En nginx es un `location` con `proxy_pass`. Debe aceptar solo ese proyecto, para no quedar como proxy abierto.

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
