# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All tasks run through Nx. Use `npx nx <target> <project>`.

```bash
# Serve
npx nx serve landing       # SSR/SSG dev server  → http://localhost:4200
npx nx serve erp           # ERP SPA             → http://localhost:4201
npx nx serve cuenta        # Cuenta SPA          → http://localhost:4203
npx nx serve transporte    # Transporte SPA      → http://localhost:4204
npx nx serve pos           # POS SPA             → http://localhost:4205
npx nx serve turnos        # Turnos SPA          → http://localhost:4206
npx nx serve cliente       # Cliente SPA         → http://localhost:4207

# Build
npx nx build landing       # Static + SSR build
npx nx build erp           # SPA build
npx nx run-many -t build   # all projects

# Lint
npx nx lint <project>
npx nx run-many -t lint

# Affected (CI-style, based on git diff vs main)
npx nx affected -t build
npx nx affected -t lint

# Release
npm run release            # commit-and-tag-version bump + changelog
```

**Installing packages:** always pass `--legacy-peer-deps` due to a pre-existing peer conflict between `angular-eslint@21` and `@angular/cli@20`.

## Architecture

```
apps/
  landing/      Angular 20 SSR/SSG, Tailwind, port 4200 — public marketing site
  erp/          Angular 20 SPA, PrimeNG 20, port 4201 — ERP application
  cuenta/       SPA + PrimeNG, port 4203 — perfil y seguridad de la cuenta
  transporte/   SPA + PrimeNG, port 4204 — gestión de transporte
  pos/          SPA + PrimeNG, port 4205 — punto de venta
  turnos/       SPA + PrimeNG, port 4206 — gestión de turnos
  cliente/      SPA + PrimeNG, port 4207 — portal de clientes
libs/
  core/         Auth, tokens, theme, i18n, tenant + data-list building blocks (cross-app)
  ui/           Shared standalone components: TurnstileComponent + auth pages + AppSwitcherComponent
  feature-base/ DataTableComponent (tonto, cross-app)
  styles/       SCSS design tokens + Tailwind @theme (brand colors, animations)
```

Path aliases:

- **Cross-app (libs)**: `@reddoc/core`, `@reddoc/ui`, `@reddoc/feature-base`, `@reddoc/styles`.
- **Intra-app (solo erp)**: `@erp/*` → `apps/erp/src/app/*`. Permitido por excepción en `@nx/enforce-module-boundaries` para evitar paths relativos profundos (los masters viven anidados en `features/<modulo>/masters/<entity>/pages/<page>/`). Úsalo para imports cross-feature (`@erp/core/...`, `@erp/i18n`, `@erp/layouts/...`). Para hermanos del mismo bounded context, sigue con relativos cortos (`./contacto.service`).

**Lo que ES cross-app va en libs/. Lo que es ERP-específico vive en `apps/erp/src/app/core/`.** El **núcleo compartido** del framework configuracional de documentos (tipos, gateway y `DocumentoDetalleService`) vive en `libs/core/documento` porque también lo consume `apps/turnos`; solo el registry, resolvers y `BaseDocumentListComponent` quedan en el ERP.

### landing

- **SSG** — `outputMode: static` with pre-rendered routes from `routes.txt`. Has a real Express `server.ts`.
- **i18n** — translation files under `src/app/i18n/`; components consume them via a translation pipe/service.
- **Tailwind** — imported via `src/tailwind.css`. Shared SCSS tokens not used here; use Tailwind utilities.
- No PrimeNG. No auth.

### apps/erp + cuenta + transporte + pos + turnos + cliente (SPAs)

The 6 SPAs share the same skeleton:

- No SSR, no hydration provider.
- **Proxy** — `proxy.conf.json` rewrites `/api/*` to `https://reddocapi.uk` (the staging/prod API). All HTTP uses the relative `/api` prefix injected via `ENVIRONMENT.apiUrl`.
- **PrimeNG theme** — single `ReddocPreset` exported from `@reddoc/core` (navy `#143049` primary, sky `#77aad7` accent), used by every app via `providePrimeNG({ theme: { preset: ReddocPreset, ... } })`.
- **Environments** — `src/environments/environment.ts` (dev), `.staging.ts`, `.prod.ts`. Swap via `fileReplacements` in `project.json`.
- **Auth pages** — every app loads `LoginComponent`/`RegisterComponent`/etc. directly from `@reddoc/ui`. Per-app branding is provided via the `APP_BRANDING` token (`{ appName, tagline }`).
- **Tailwind brand tokens** — each app's `src/tailwind.css` imports `libs/styles/src/tailwind/brand.css`, which exposes `--color-brand-*` and the `fade-up` / `drift1` / `drift2` animations as Tailwind v4 `@theme` values.
- **Logos** — `libs/ui/src/assets/logos/` is wired in each app's `project.json` so `<img src="/logos/reddoc.svg">` resolves.

### libs/core — auth infrastructure + data-list cross-app

The auth pattern is an abstract generic service extended per-app:

```
BaseAuthService<TUser extends BaseUsuario>   (libs/core)
  └── AuthService extends BaseAuthService<Usuario>  (apps/<app>)
```

`BaseAuthService` handles login, me, refresh, logout, forgotPassword, resetPassword, verifyEmail, resendVerification, register using **HTTP-only cookies** — no tokens in localStorage.

**Injection tokens** that must be provided in each app's `app.config.ts`:

| Token               | Purpose                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ENVIRONMENT`       | `{ apiUrl, turnstileSiteKey, cuentaUrl?, erpUrl?, turnosUrl? }` — las `<app>Url` alimentan el app-switcher           |
| `ROUTE_PATHS_TOKEN` | `{ auth: { login, register, forgotPassword, resetPassword, resendVerification, verifyEmail }, dashboard: { root } }` |
| `AUTH_SERVICE`      | `useExisting: AuthService` — exposes `AuthServiceContract` to interceptors, guards, and shared auth pages            |
| `AUTH_SKIP_URLS`    | String array of API paths that bypass the 401-refresh logic                                                          |
| `APP_BRANDING`      | `{ appName, tagline? }` — consumed by the shared auth pages in `@reddoc/ui` to render per-app brand panel            |
| `CURRENT_APP`       | `ReddocAppId` (`'erp' \| 'turnos'`) — quién soy; el app-switcher lo usa para excluirse de su propia lista            |

**Guards** (`authGuard`, `publicGuard`) inject `AUTH_SERVICE` and `ROUTE_PATHS_TOKEN`.

**errorInterceptor** — on 401, attempts one token refresh via `AUTH_SERVICE.refresh()`. Uses `TokenRefreshService` (signal + Subject) to queue concurrent requests while refresh is in-flight. Skips refresh for URLs listed in `AUTH_SKIP_URLS`.

**`data-list/` cross-app building blocks** (`libs/core/src/lib/data-list/`):

- Tipos: `ColumnDef`, `FilterField`, `ListQuery`, `ListResponse`, `FilterCondition`, `SortSpec`.
- `serializeListQuery(query)` — convención Django REST de query-params (filtros `field__operator=value`, ordering, paginación).
- `FilterStorageService` — persistencia agnóstica de filtros en localStorage por `storageKey: string`.

Cualquier app del monorepo puede usarlos para construir listas paginadas.

### libs/ui — shared standalone components

- `TurnstileComponent` (`lib-turnstile`) — Cloudflare Turnstile widget. Reads `turnstileSiteKey` from `ENVIRONMENT`. Dev key `1x00000000000000000000AA` always passes.
- Auth pages (`LoginComponent`, `RegisterComponent`, `ForgotPasswordComponent`, `ResetPasswordComponent`, `ResendVerificationComponent`, `VerifyEmailComponent`) — fully implemented; each app routes to them via eager `component:` (Nx prohibits mixing lazy + static imports of the same lib).
- `AppSwitcherComponent` (`lib-app-switcher`) — waffle en el header (`app-header__actions`) que salta entre apps hermanas. Requiere que la app provea `CURRENT_APP` y declare las `<app>Url` de sus hermanas en `ENVIRONMENT`. Trae su propio dict (`AppSwitcherTranslationsHost` + `appSwitcherEs/En`), igual que las auth pages. Lo usan erp y turnos.
- `PageActionsComponent` (`lib-page-actions`) — la fila de botones de una página (volver / guardar). Se pega bajo el header al hacer scroll y solo entonces se viste de fondo + filete. Se usa envolviendo los botones, sin inputs. El sangrado lateral sale de `--page-gutter`, que **cada layout declara sobre su scrollport** con el valor de su padding (ya lo hacen los `workspace-layout` de erp y turnos); un layout que no la declare cae al default de `1.75rem`. El scrollport **no debe llevar `padding-top`** (los navegadores no acuerdan desde dónde ancla un sticky con padding superior): el gutter de arriba va como espaciador `::before` en el flujo. Ver el patrón completo en `.interface-design/system.md`.
- Assets: `src/assets/logos/reddoc.svg` and `reddoc-on-dark.svg` — copied into each app's build via `project.json` assets glob.

### libs/feature-base — building blocks de listados

- `DataTableComponent` (`lib-data-table`) — tabla "tonta": recibe `columns`, `items`, `rowActions` por input y emite eventos. Sin HTTP, sin config. Reusable por cualquier app.
- Tipos `RowAction`, `RowActionInvokedEvent`, `PageChangeEvent`.

### apps/erp — module architecture

El ERP usa un **enfoque híbrido** (documentado en `docs/architecture/erp-module-architecture.md`):

| Camino                                   | A quién aplica                                                                                                       | Cómo se implementa                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework configuracional (camino A)** | Documentos transaccionales (factura, nota crédito, etc.) sobre `/api/documento` discriminado por `documento_tipo_id` | `DocumentEntityConfig` declarativo + `MODULE_REGISTRY` lazy + resolvers + `BaseDocumentListComponent`. El **núcleo compartido** (tipos, `ENTITY_DATA_GATEWAY`/`HttpEntityDataGateway`, `DocumentoDetalleService`, `DOCUMENT_TYPE_ID`) vive en **`libs/core/documento`** (vía `@reddoc/core`, lo consumen erp y turnos); lo **ERP-específico** (registry, resolvers, store, actions, storage, `BaseDocumentListComponent`) vive en **`apps/erp/src/app/core/module-config/`**. |
| **Features directos (camino B)**         | Masters administrativos (contacto, ítem, sede, almacén, etc.) con endpoint propio                                    | Cada master: `services/*.service.ts` (extends `BaseHttpService`) + `pages/*-list/*-list.component.ts` que compone `<lib-data-table>` con inputs concretos                                                                                                                                                                                                                                                                                                                     |
| **Building blocks compartidos**          | Ambos caminos + otras apps potencialmente                                                                            | `<lib-data-table>` (`@reddoc/feature-base`), tipos `ColumnDef`/`FilterField`/`ListQuery`, `serializeListQuery`, `FilterStorageService` (todos en `@reddoc/core` data-list)                                                                                                                                                                                                                                                                                                    |

**Estructura del framework configuracional**:

El **núcleo compartido** vive en `libs/core/documento/` (expuesto por `@reddoc/core`, consumido por erp y turnos):

```
libs/core/src/lib/documento/
├── entity-config.types.ts       DocumentEntityConfig, ModuleConfig, EntityConfig, capabilities
├── module-config.types.ts       ModuleConfig
├── documento.types.ts           Read/Payload base de documento y detalle
├── document-types.constants.ts  DOCUMENT_TYPE_ID
├── entity-data-gateway.ts       ENTITY_DATA_GATEWAY (token) + EntityDataGateway (interface)
├── http-entity-data-gateway.service.ts  HttpEntityDataGateway
├── documento-detalle.service.ts DocumentoDetalleService
└── index.ts
```

Lo **ERP-específico** queda en `apps/erp/src/app/core/module-config/`:

```
apps/erp/src/app/core/module-config/
├── module-registry.token.ts     InjectionToken + ModuleConfigLoader / ModuleRegistry
├── module-registry.constant.ts  ERP_MODULE_REGISTRY (módulos transaccionales)
├── module-registry.service.ts   Carga lazy + cache + validación
├── module-navigation.store.ts   Signals del módulo/documento activos
├── resolvers/                   activeModuleResolver, activeDocumentResolver
├── data/                        documento.service.ts (el gateway compartido vive en libs/core/documento)
├── storage/                     buildEntityStorageKey (usa EntityConfig)
├── errors/                      Errores tipados del dominio
├── importar-documento/          Importación desde documento afectado
├── components/
│   └── base-document-list/      BaseDocumentListComponent (lazy load — NO exportar desde el barrel)
└── index.ts                     Re-exporta los tipos desde @reddoc/core; sin BaseDocumentListComponent (evita PrimeNG en el initial bundle)
```

El `BaseDocumentListComponent` se importa **siempre vía `loadComponent`** desde las rutas de documentos, no por barrel.

**Módulos como contexto de navegación**: el ERP se organiza en módulos (General, Compra, Venta, Inventario…). El módulo activo deriva del primer segmento de la URL tras el tenant: `/t/:slug/<modulo>/<entidad>`. Cada módulo aporta su `ErpModuleDescriptor` (en `apps/erp/src/app/features/<modulo>/<modulo>.module-descriptor.ts`) que declara su id, nombre, icono, ruta hija por defecto y las secciones del sidebar que muestra cuando está activo. La lista está en `apps/erp/src/app/core/erp-modules/erp-modules.registry.ts`.

- **Topbar** (`apps/erp/src/app/layouts/module-bar/`): renderiza un link por cada módulo habilitado por `PermissionsService`. Highlight al activo.
- **Sidebar** (`apps/erp/src/app/layouts/workspace-layout/`): se filtra al módulo activo leyendo `ActiveModuleStore.activeDescriptor().menu`. Empty state cuando no hay módulo activo (ej: `/t/:slug/dashboard`).
- **Active module store** (`apps/erp/src/app/core/erp-modules/active-module.store.ts`): signal escrito por `erpModuleResolver(id)` puesto en la ruta raíz de cada `<modulo>.routes.ts`.
- **Permisos** (`apps/erp/src/app/core/permissions/`): tres ejes ortogonales — qué módulos compró el tenant (flags `acceso_*` del contenedor), qué puede hacer el usuario sobre cada modelo del backend (`GET /general/modelo/<id>/permiso/`, pedido al entrar al feature) y si administra el contenedor (`rol_id`). Ver `docs/guides/permisos-erp.md` antes de tocarlo.

**Estructura de carpetas dentro de un módulo (camino B)**: cada master es un bounded context auto-contenido bajo `masters/<entity>/`:

```
apps/erp/src/app/features/<modulo>/
├── <modulo>.routes.ts              · dispatcher: delega cada master vía loadChildren
├── <modulo>.module-descriptor.ts   · ErpModuleDescriptor
├── shared/                         · solo si surge algo compartido entre masters del módulo
└── masters/
    └── <entity>/                   · singular, kebab-case (contacto, cuenta-banco, forma-pago)
        ├── <entity>.routes.ts      · list / new / edit / detail
        ├── <entity>.model.ts
        ├── <entity>.service.ts
        ├── <entity>.constants.ts
        ├── pages/
        │   ├── <plural>-list/      · plural para la lista
        │   ├── <entity>-form/      · singular — compartido create+edit
        │   └── <entity>-detail/
        ├── components/             · solo si surgen (NO crear preventivo)
        └── utils/                  · lógica de negocio específica
```

Regla: lo que solo importa a un master vive dentro del master.

**Para agregar un master nuevo** (camino B):

1. Crear `apps/erp/src/app/features/<modulo>/masters/<entity>/` con `<entity>.model.ts`, `<entity>.service.ts` (extends `BaseHttpService`), `<entity>.constants.ts`, `<entity>.routes.ts` y `pages/<plural>-list/<plural>-list.component.ts` componiendo `<lib-data-table>`.
2. En `<modulo>.routes.ts`, delegar: `{ path: '<plural>', loadChildren: () => import('./masters/<entity>/<entity>.routes').then(m => m.<ENTITY>_ROUTES) }`. URL: `/t/:slug/<modulo>/<plural>`.
3. Entrada en el `menu` del `<modulo>.module-descriptor.ts` (path relativo: `<plural>`).
4. Claves i18n `entities.<entity>.*` en `app.es.ts` / `app.en.ts`.

**Formularios (masters y documentos):** el botón de guardar **no** se deshabilita por `form.invalid` — un botón muerto no explica qué falta ni deja avanzar. Va `[disabled]="isSaving()"` y `libFocusInvalid` (`FocusInvalidDirective`, de `@reddoc/ui`) sobre el `<form>`: al intentar guardar en blanco marca todo como tocado —así aparece cada `<lib-field-error>`— y lleva a la persona al primer campo que falta. El guard `if (form.invalid …) return;` del `onSubmit` no cambia.

**Al guardar un documento se cae en su ficha, no en el listado:** crear y editar terminan en `routes.detail` para que la persona revise lo que quedó almacenado. En alta el id sale de la respuesta del `POST` (`extractDocumentoId`, en `@erp/core/module-config`); si no viniera, se cae al listado antes que navegar a una URL inválida. Excepción viva: depreciación y cierre, que al crear entran a `editar/:id` porque el documento nace vacío y sus líneas se cargan desde el form. Cancelar sigue volviendo al listado.

**Para agregar un documento nuevo** (camino A):

1. Crear `<modulo>.config.ts` que exporte `ModuleConfig` con sus `documents`.
2. Registrar en `ERP_MODULE_REGISTRY` (1 línea).
3. Lazy route bajo `<modulo>.routes.ts` que cargue `BaseDocumentListComponent` vía `loadComponent`. URL final: `/t/:slug/<modulo>/<documento>/list`.
4. Sumar la entrada al `menu` de `<modulo>.module-descriptor.ts`.

**Para agregar un módulo nuevo**:

1. Crear `features/<id>/<id>.module-descriptor.ts` con el `ErpModuleDescriptor`.
2. Crear `features/<id>/<id>.routes.ts` con `erpModuleResolver('<id>')` y rutas hijas (o placeholder).
3. Registrarlo en `apps/erp/src/app/core/erp-modules/erp-modules.registry.ts`.
4. Agregar la entrada `loadChildren` en `app.routes.ts` bajo `/t/:tenantSlug`.
5. Sumar las claves i18n `modules.<id>.name` en `app.es.ts` / `app.en.ts`.

**No usar el framework para**: `contenedores`, `dashboard`, settings de usuario, wizards. Esas son features tradicionales sin tabla genérica.

### Tenant scoping de las peticiones HTTP (`X-Tenant`)

El `tenantInterceptor` (`libs/core`) agrega la cabecera `X-Tenant` con el slug del tenant activo. **No conoce ninguna feature**: cada petición declara su scope mediante el `HttpContextToken` `TENANT_SCOPED` (default `true` — la mayoría de los endpoints del ERP son tenant-scoped).

- **Master tenant-scoped** (lo normal): nada que hacer. `BaseHttpService` ya marca `tenantScoped = true`.
- **Servicio global** (endpoint en el schema público — `/contenedor/`, `/seguridad/usuario…`, catálogos globales): declarar `protected override readonly tenantScoped = false;` **en el propio servicio**. No se toca `libs/core`. Si el servicio inicializa una petición en un field initializer, el override debe declararse **antes** de ese campo.
- **Servicio con endpoints mixtos** (raro): pasar un `HttpContext` con `TENANT_SCOPED` por petición.
- `BaseAuthService` ya marca sus llamadas `/seguridad/*` como globales.

Olvidar marcar un servicio global → el backend resuelve contra el schema del tenant y responde **404**. El fix es local al servicio, visible en su code review.

## Key conventions

- **Standalone components** throughout — no NgModules.
- **Signals** for local state (`signal()`, `computed()`); no `BehaviorSubject` in new code.
- **Lazy loading** — feature routes use `loadComponent` / `loadChildren`. Exception: pages from `@reddoc/ui` are eager-loaded (Nx module-boundaries rule).
- **`provideAppInitializer`** in each SPA's `app.config.ts` calls `auth.me()` on startup to rehydrate session from cookie.
- **Commits** follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) — enforced by commitlint on PRs. Body lines max 100 chars.
- **SCSS** — component styles are scoped; global Tailwind brand tokens live in `libs/styles/src/tailwind/brand.css`. Avoid inline styles.
- **Typed errors** — never `throw new Error('msg')` generic. Define a specific class extending `Error`.
- **No `any`** — use `unknown` + narrowing where the type is genuinely unknown.
- **Fechas** — el formato sale de `FORMATO_FECHA` (`@reddoc/core`), única fuente para las tres
  notaciones (PrimeNG, `| date` de Angular, y con hora). Para pintar: `formatFechaCorta`
  (`05/08/2026` — campos, tablas, fichas) o `formatFechaLarga` (`05 de agosto de 2026` — solo la
  cabecera de un documento). Un `<p-datepicker>` **no declara `dateFormat`**: lo hereda del
  translation global (`REDDOC_PRIMENG_ES`); solo se declara para mostrar otra cosa, como `mm/yy`
  al elegir un mes. Nada de `toLocaleDateString` suelto ni de `iso.slice(0, 10)`.
- **Readonly by default** — prefer `readonly` properties and `readonly` arrays in configs and contracts.

## Tener en cuenta

- Para los textos no crees por ejemplo "Nueva Empresa" esta mal para nosotros, debe ser "Nueva empresa" no uses mayusculas al inicio de las palabras despues de la primera palabra
- siempre procura usar clases de tailwind

## Documentación de arquitectura

- `docs/architecture/erp-module-architecture.md` — decisión arquitectónica completa del framework de módulos del ERP (enfoque híbrido v2.0). Leerlo antes de agregar masters o documentos al ERP.
- `docs/guides/agregar-modulo-erp.md` — guía paso a paso (recetario) para agregar un módulo nuevo al ERP sin perderse: esqueleto navegable en 5 pasos + cómo sumar masters/documentos y el menú del sidebar.
- `docs/guides/agregar-documento-erp.md` — guía paso a paso para agregar un documento transaccional (camino A): `DocumentEntityConfig`, registro en el `ModuleConfig`/registry, rutas con resolvers y capabilities. Incluye el caso "primer documento del módulo".
- `docs/guides/permisos-erp.md` — cómo se decide qué ve y qué puede abrir un usuario dentro del tenant, explicado como recorrido en 6 pasos (de dónde salen los permisos → topbar → sidebar → ruta → botones → 403 del backend). Cubre los tres ejes (plan del tenant / permisos del usuario / rol de contenedor), el catálogo de modelos del backend (`MODELO`, espejo de `gen_modelo`), `withPermission` y el `ForbiddenPageStore`. Leerlo antes de tocar permisos o de sumar un master a un módulo ya migrado.
- `docs/guides/importar-erp.md` — cómo funciona la **importación por Excel** de un listado: el `ImportDialogComponent` (tonto) + el `importar(file)` multipart del servicio + `parseImportErrors`. Distingue las tres cosas que el diálogo ofrece y que se confunden: el archivo del usuario, la **plantilla** (`…/importar-ejemplo/`, del backend) y los **maestros** (XLSX públicos de consulta, declarados por listado con `IMPORT_MASTER.*`). Leerlo antes de sumar importación a un master.
- `docs/guides/agregar-accion-extra-erp.md` — guía paso a paso para agregar una **acción extra** a un documento (botón en el dropdown "Acciones" que abre su propio modal y endpoint): patrón `EntityActionStrategy` + registro en `ENTITY_ACTION_PROVIDERS` + `extraActionIds`. Ejemplo vivo: "Generar" en pedido-servicio.
