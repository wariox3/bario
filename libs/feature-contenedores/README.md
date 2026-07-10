# @reddoc/feature-contenedores

Pantalla de selección y administración de contenedores (empresas), compartida por las apps con tenant.
Hoy la consumen `apps/erp` y `apps/turnos`.

## Dos entry points, a propósito

| Import                              | Qué trae                                                           | Cómo se importa                                          |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| `@reddoc/feature-contenedores`      | `ContenedoresListComponent`, `ContenedoresCapabilities`            | **Solo dinámico** (`loadComponent`) — o `import type`    |
| `@reddoc/feature-contenedores/i18n` | `contenedoresEs`, `contenedoresEn`, `ContenedoresTranslationsHost` | Estático, desde el `app.es.ts` / `app.en.ts` de cada app |

El componente arrastra PrimeNG (`Menu`, `Dialog`, `Tabs`, `AutoComplete`) y los seis diálogos, así que
tiene que quedar en un chunk lazy: `rootRedirectGuard` manda al usuario que ya tiene un tenant guardado
directo a `/t/:slug/...` sin pasar nunca por esta pantalla.

Pero `provideI18n` recibe un objeto estático (`I18N_DICTIONARIES` es un value token, no hay registro
lazy), así que el diccionario **tiene** que cargarse eager. Si viviera en el barrel principal, ese import
estático colapsaría el chunk contra el bundle inicial y la laziness moriría en silencio. De ahí la
separación: `src/i18n.ts` no importa `src/index.ts`, son grafos de módulos disjuntos.

`eslint.config.mjs` exime ese specifier exacto de `@nx/enforce-module-boundaries` (la regla
"static imports of lazy-loaded libraries" es de granularidad proyecto y no ve la separación). El barrel
principal sigue vigilado: importarlo estático es un error, y es lo que de verdad rompería la laziness.

Los tres diálogos van detrás de `@defer`, así que salen a chunks propios y no se descargan hasta que se
abren. Una app que no habilite `create` / `edit` / `invite` / `delete` nunca los baja.

## Capabilities

Cada app declara qué acciones habilita, como `data` de su ruta de contenedores. No es un
`InjectionToken` justamente porque `app.config.ts` tendría que importarlo estático desde este lib:

```ts
// apps/<app>/src/app/features/contenedores/contenedores.routes.ts
import type { ContenedoresCapabilities } from '@reddoc/feature-contenedores'; // se borra al compilar

const APP_CONTENEDORES_CAPABILITIES: ContenedoresCapabilities = {
  create: true,
  edit: true,
  invite: false, // esta app no gestiona miembros
  delete: false,
  subscription: true,
  viewToggle: true,
};

export const CONTENEDORES_ROUTES: Route[] = [
  {
    path: '',
    data: { capabilities: APP_CONTENEDORES_CAPABILITIES },
    loadComponent: () =>
      import('@reddoc/feature-contenedores').then((m) => m.ContenedoresListComponent),
  },
];
```

`withComponentInputBinding()` ata `data.capabilities` al input del componente. Si no se pasa nada, el
default es `CONTENEDORES_CAPABILITIES_FULL`.

Escribí las seis banderas a mano aunque las quieras todas en `true`. `CONTENEDORES_CAPABILITIES_FULL`
es un **valor** del barrel principal, así que importarlo desde las rutas de la app sería un import
estático del lib — exactamente lo que colapsa el chunk lazy. Hoy erp y turnos habilitan las seis.

## Qué necesita la app que lo consuma

- `AUTH_SERVICE` — para leer `currentUser()`: prellenar el form de creación y marcar "vos" en la lista de miembros.
- `TENANT_ROUTES` — `tenantHome(slug)` define a dónde entra cada app (`/dashboard` en el ERP, `/inicio` en turnos).
- `ENVIRONMENT.cuentaUrl` — destino del botón de suscripción. Sin él, el botón no hace nada.
- El diccionario en `provideI18n`, y que su `AppDict` extienda `ContenedoresTranslationsHost`.

## Deuda conocida

Hay textos en español hardcodeados que ya venían así del ERP y que la mudanza no arregló:
`getSuscripcionExpiryLabel()` (`'Vencida'`, `'Vence hoy'`, `'Vence en Nd'`), el mapa `frecuenciaLabel`
(`Prueba` / `Mensual` / `Anual`) y el literal `Inactivo` en los templates de row y card. Ahora viven en un
lib que por lo demás sí está traducido.
