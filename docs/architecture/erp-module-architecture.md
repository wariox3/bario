# Arquitectura modular del ERP

> **Estado**: Decisión aprobada · migración en curso
> **Fecha**: 2026-05-13
> **Autores**: Sebastian
> **Aplica a**: `apps/erp` del monorepo `reddoc-monorepo`
> **Versión del documento**: 2.1 (módulos como contexto de navegación + topbar + sidebar filtrado)

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Contexto](#2-contexto)
3. [Análisis del sistema legacy](#3-análisis-del-sistema-legacy)
4. [Reflexión post-implementación (v1.1 → v2.0)](#4-reflexión-post-implementación-v11--v20)
5. [Principios rectores](#5-principios-rectores)
6. [Arquitectura propuesta](#6-arquitectura-propuesta)
7. [Convenciones de naming](#7-convenciones-de-naming)
8. [Estructura por módulo](#8-estructura-por-módulo)
9. [Manejo de errores y casos límite](#9-manejo-de-errores-y-casos-límite)
10. [Estrategia de testing](#10-estrategia-de-testing)
11. [Trade-offs aceptados](#11-trade-offs-aceptados)
12. [Plan de migración](#12-plan-de-migración)
13. [Decisiones tomadas](#13-decisiones-tomadas)
14. [Referencias](#14-referencias)

---

## 1. Resumen ejecutivo

El ERP albergará **8+ módulos de negocio** con dos clases de entidades cuyo nivel de reuso real es muy distinto:

- **Documentos transaccionales** (factura, nota crédito, nota débito, factura POS, factura recurrente, etc.): comparten el endpoint genérico `/api/documento` discriminado por `documento_tipo_id`. El reuso es **estructural** — mismo schema, mismo flujo, misma forma de filtros.
- **Masters administrativos** (contacto, ítem, sede, almacén, cuenta banco, asesor, resolución, etc.): cada uno tiene su **propio endpoint REST**, su propio shape de datos y, frecuentemente, su propio UX. El reuso es solo de **building blocks de UI** (tabla, filtros, toolbar).

Adoptamos un **enfoque híbrido**:

| Camino                          | A quién aplica             | Cómo se implementa                                                                                                               |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Framework configuracional**   | Documentos transaccionales | `EntityConfig` declarativo + `MODULE_REGISTRY` lazy + resolvers + `BaseDocumentList` que orquesta. Aprovecha el endpoint único.  |
| **Features directos**           | Masters administrativos    | Cada master tiene su `*-list.component.ts`, su `*Service` y su propio routing. Compone building blocks compartidos por inputs.   |
| **Building blocks compartidos** | Ambos caminos              | `<lib-data-table>`, `<lib-filter-panel>`, `<lib-toolbar-actions>`, tipos `ColumnDef`/`FilterField`, gateway HTTP, filter storage |

Este enfoque emerge de la **reflexión post-implementación** documentada en la sección 4: aplicar un framework configuracional uniforme a entidades cuyo backend es heterogéneo introduce indirección sin beneficio. El framework sigue valiendo donde el reuso es genuino (documentos) y desaparece donde no lo era (masters).

---

## 2. Contexto

### 2.1 Estado actual del nuevo ERP

`apps/erp` corre sobre **Angular 20 standalone + PrimeNG 20 + Tailwind v4** dentro de un monorepo Nx. Features no-CRUD ya existentes (`contenedores`, `dashboard`) quedan fuera del framework.

```
apps/erp/src/app/
├── core/                  · constants, guards, module-config registry concreto
├── features/
│   ├── auth/              · login, register, etc. (vive en libs/ui)
│   ├── contenedores/      · selección de tenant
│   ├── dashboard/         · placeholder
│   └── general/           · (en migración a feature directo, ver §12)
├── layouts/               · ShellLayout + WorkspaceLayout
└── shared/                · user-menu, etc.
```

Rutas: `/` redirige según auth, `/contenedores` selecciona tenant, `/t/:tenantSlug/...` entra al workspace del tenant.

### 2.2 El legacy: `app.reddoc`

Sistema Angular 17 en `/home/tamerlan/Desktop/semantica/app.reddoc/` con 8 módulos de negocio y ~3,120 líneas de configuración declarativa. Resolvió el problema "muchas entidades sobre el mismo backend" con un patrón configuration-driven que aplicaba **tanto a documentos como a masters** (vía `base-documento/base-lista` y `base-administracion/base-lista`, que en la práctica compartían 70% del código).

---

## 3. Análisis del sistema legacy

### 3.1 Flujo de datos

```
URL: /compra/documento/lista?modelo=300
   │
   ▼
ConfigModuleService escucha NavigationEnd del router
   │
   ▼
Extrae del URL:  modulo='compra'  funcionalidad='documento'  modelo='300'
   │
   ▼
switch(modulo) → carga COMPRA_CONFIGURACION (constante importada estáticamente)
   │
   ▼
Busca: funcionalidad='documento' → modelo=300 → entidad FACTURACOMPRA
   │
   ▼
Emite vía currentModelConfig$ (BehaviorSubject<ModeloConfig | null>)
   │
   ▼
BaseListaComponent (suscrito vía takeUntil) extrae:
   · endpoint, queryParams, ui flags, rutas, filters
   │
   ▼
HTTP GET + render
```

### 3.2 Aciertos que preservamos (siguen vigentes en v2.0)

| Acierto                                | Por qué importa                                                    |
| -------------------------------------- | ------------------------------------------------------------------ |
| Una constante por módulo describe todo | Aplica a **documentos**: endpoint genérico justifica un descriptor |
| Componentes base reutilizables         | Aplica a **documentos**: 14+ tipos sobre el mismo endpoint         |
| UI flags por entidad                   | Aplica a **documentos**: activar "Generar", "Importar ZIP", etc.   |
| Filtros declarativos compartidos       | Building block común: `FilterField[]` se reusa entre features      |

### 3.3 Antipatrones corregidos (no repetiremos)

| Antipatrón legacy                                                                  | Cómo lo corregimos                                                                |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `switch(modulo)` en el service global                                              | Registry con lazy imports (`Record<ModuleId, ModuleLoader>`)                      |
| `queryParams: { [key: string]: any }`                                              | Tipos estrictos por entidad                                                       |
| `if (this._modelo === 'GenDocumento')` hardcoded en componente base                | Gateway absorbe la lógica; el componente no conoce backend                        |
| `ViewContainerRef.createComponent()` para acciones extras                          | Strategy pattern con `multi: true` providers                                      |
| **`base-documento/base-lista` + `base-administracion/base-lista` — 70% duplicado** | **Diagnóstico real: no eran la misma cosa**. Resolvemos separando, no unificando. |
| `BehaviorSubject`                                                                  | `signal` + `computed` con lectura síncrona                                        |
| Listener global de `NavigationEnd`                                                 | Resolvers por ruta + `withComponentInputBinding()`                                |
| Imports estáticos de las 8 configs                                                 | Lazy `import()` dentro del registry                                               |
| `localStorage` sin versión                                                         | Clave con `schemaVersion`                                                         |
| HTTP directo desde el componente base                                              | `EntityDataGateway` abstracto inyectado (DIP)                                     |
| Service que mezcla carga + estado + navegación                                     | Dos servicios separados: registry vs navigation store                             |

---

## 4. Reflexión post-implementación (v1.1 → v2.0)

Esta sección documenta **por qué** el documento cambió. Sirve como registro histórico para que un dev futuro entienda las razones de la simplificación.

### 4.1 Lo que se construyó en v1.1

Tras aprobar el documento v1.1 se implementó la foundation completa en tres commits:

- **Fase 1**: tipos discriminados (`document | master | utility`), `MODULE_REGISTRY` con `InjectionToken`, `ModuleRegistryService`, `ModuleNavigationStore`, 7 errores tipados, sidebar dinámico (acordeón derivado del registry).
- **Fase 2**: `activeModuleResolver`, `activeEntityResolver`, `EntityDataGateway` (interface + impl HTTP default), `withComponentInputBinding()` en `provideRouter`.
- **Fase 4**: nueva lib `libs/feature-base/`, `BaseListComponent` con tabla PrimeNG, paginación, confirmaciones, restauración de filtros desde storage versionado.

Total: ~2,000 LoC de scaffolding antes del primer CRUD funcional. El módulo `general` con la entidad `contacto` (`kind: 'master'`) servía como smoke test.

### 4.2 Lo que se observó al usarlo

Durante la implementación emergieron tres síntomas claros:

1. **Indirección desproporcionada para masters**: para ver dónde se renderiza la lista de contactos hay que leer **5 archivos** (`general.config.ts` → `MODULE_REGISTRY` → `activeModuleResolver` → `activeEntityResolver` → `BaseListComponent`) cuando una lista directa son **2 archivos** (`contactos-list.component.ts` + `contactos-list.component.html`).

2. **El backend no estaba unificado**: cada master tiene su propio endpoint (`/api/general/contacto`, `/api/general/item`, `/api/inventario/almacen`, etc.). La abstracción del framework asume un patrón de acceso uniforme que solo se cumple para documentos.

3. **Las "diferencias entre kinds" eran datos, pero las diferencias UX no**: un contacto tiene flags cliente/proveedor/empleado; un ítem tiene precio + impuestos + categoría; un almacén tiene direcciones + bodegas. Cada uno termina necesitando un componente extra (`<entity-extra-fields>`) o un `kind: 'utility'` que es básicamente un escape hatch. El framework sirve mejor cuando las entidades son **realmente similares**, y los masters no lo son.

### 4.3 Lo que validó la sospecha del legacy

El legacy ya tenía **dos componentes** distintos para documentos y administración (`base-documento/base-lista` 491 LoC vs `base-administracion/base-lista` 266 LoC) con 70% de duplicación. En v1.1 lo "corregimos" unificando los dos en un solo componente que ramifica por `kind`. La reflexión es que **el legacy tenía razón en separarlos** — la duplicación señalaba que eran cosas distintas, no que necesitaban una abstracción común. El error del legacy fue duplicar código, no haber separado los componentes.

### 4.4 Pivote: enfoque híbrido

Conservamos el framework configuracional donde el reuso es **estructural y real** (documentos sobre endpoint genérico) y lo retiramos donde solo era **superficial** (masters con endpoints heterogéneos). Los building blocks de UI (tabla, filtros, toolbar) son reusables por inputs concretos, sin necesidad de configuración global.

### 4.5 Qué se conserva del trabajo de v1.1

| Pieza                                                                                  | Estado en v2.0                                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ColumnDef`, `FilterField`, `ListQuery`, `ListResponse`, `FilterCondition`, `SortSpec` | **Se queda** como building blocks de tipos                                                                     |
| `EntityDataGateway` / `HttpEntityDataGateway`                                          | **Se queda** (renombre a evaluar): el DIP sigue valiendo                                                       |
| `EntityFilterStorageService`                                                           | **Se refactoriza** para aceptar `storageKey: string` directo (no acoplado a `EntityConfig`)                    |
| `MODULE_REGISTRY` + `ModuleRegistryService` + `ModuleNavigationStore` + resolvers      | **Se queda** pero **aplica solo a documentos**                                                                 |
| `BaseListComponent` (v1.1)                                                             | **Renombra** a `BaseDocumentListComponent` y elimina las ramas de masters/utility                              |
| `MasterEntityConfig`, `MasterCapabilities`, `UtilityEntityConfig`                      | **Se elimina** del framework                                                                                   |
| Sidebar dinámico (v1.1)                                                                | **Se refactoriza** a sidebar **híbrido**: items declarativos + acordeones derivados del registry de documentos |
| Módulo `general` registrado (v1.1)                                                     | **Se elimina** del registry; pasa a ser feature directo con sus propias rutas                                  |

---

## 5. Principios rectores

Las decisiones técnicas se justifican contra estos principios. Cualquier abstracción que no esté motivada por al menos uno de ellos es deuda potencial.

### 5.1 SOLID

- **SRP — Single Responsibility**: cada clase tiene una razón para cambiar. `ModuleRegistryService` solo carga configs. `ModuleNavigationStore` solo mantiene el estado de la navegación de documentos. Cada master tiene su servicio HTTP propio.
- **OCP — Open/Closed**: agregar un documento nuevo a un módulo existente no requiere modificar el core. Agregar un master nuevo requiere crear su archivo y registrar su ruta — cero modificaciones a otros features.
- **LSP — Liskov Substitution**: cualquier `DocumentEntityConfig` es consumible por `BaseDocumentListComponent` sin ramificación adicional. Cualquier `Resource` que cumpla el contrato de `<lib-data-table>` se renderiza igual.
- **ISP — Interface Segregation**: `DocumentEntityConfig` declara únicamente lo que los documentos necesitan. Los masters no arrastran `documentTypeId` ni `inventoryEffect`.
- **DIP — Dependency Inversion**: componentes y páginas dependen de abstracciones (`EntityDataGateway`, tokens de servicio), no de implementaciones concretas.

### 5.2 YAGNI y proporcionalidad

- **YAGNI ("you aren't gonna need it")**: no se abstrae lo que solo se usa una vez. Si una pieza de configuración solo aparece en una entidad, vive en esa entidad.
- **Proporcionalidad**: la complejidad de la abstracción se mide contra el número real de casos que la justifican. Una abstracción válida para 14 entidades (documentos) no se traslada automáticamente a 6 entidades (masters) que no comparten estructura.
- **Repetición preferida a abstracción prematura**: tres listas casi iguales son aceptables. La abstracción aparece cuando la repetición duele, no antes.

### 5.3 Otros principios

- **Inmutabilidad por defecto**: todo `readonly`. Las configs no se mutan en runtime.
- **Type-safety estricto**: `any` está prohibido. Usar `unknown` + parseo explícito donde el tipo es genuinamente desconocido.
- **Lectura síncrona donde se pueda**: signals sobre observables para estado no derivado de I/O.
- **Composición sobre herencia**: los componentes reciben colaboradores vía DI o inputs, no extienden clases.
- **Fail fast, fail loud**: errores de configuración explotan en tiempo de carga; nunca se silencian.

---

## 6. Arquitectura propuesta

Dos caminos coexisten en el ERP, alimentados por un set de building blocks compartidos. Sobre ellos vive una **capa de navegación por módulos** que define la organización jerárquica de la UX (topbar + sidebar filtrado + URLs con prefijo de módulo).

### 6.0 Módulos como contexto de navegación

El ERP se organiza en **módulos de negocio** visibles en un topbar (General, Compra, Venta, Inventario…). El módulo activo deriva del primer segmento de la URL después del tenant: `/t/:slug/<modulo>/...`. El sidebar se filtra al módulo activo — solo muestra sus masters y documentos.

Este concepto es ortogonal al enfoque híbrido (camino A / camino B): un módulo puede contener **solo masters** (General), **solo documentos** (Compra) o **ambos**. La capa de navegación los trata por igual.

#### 6.0.1 URL pattern

```
/t/:tenantSlug                                  redirect al primer módulo accesible
/t/:tenantSlug/<modulo>                         activa el módulo, redirige a su default child
/t/:tenantSlug/<modulo>/<master>                master del módulo (camino B)
/t/:tenantSlug/<modulo>/<documento>/list        listado de documento (camino A)
/t/:tenantSlug/<modulo>/<documento>/new         alta del documento
/t/:tenantSlug/<modulo>/<documento>/edit/:id    edición
/t/:tenantSlug/<modulo>/<documento>/detail/:id  detalle
```

Ejemplos concretos:

- `/t/ascendev/general/contactos` — master Contactos del módulo General.
- `/t/ascendev/compra/factura-compra/list` — documentos del módulo Compra (cuando se sumen).

#### 6.0.2 `ErpModuleDescriptor`

Cada módulo aporta un descriptor (en `apps/erp/src/app/features/<id>/<id>.module-descriptor.ts`) que define su comportamiento en la capa de navegación:

```ts
// apps/erp/src/app/core/erp-modules/erp-module.types.ts
export interface ErpModuleDescriptor {
  readonly id: string; // 'general', 'compra', 'venta', 'inventario'
  readonly displayNameKey: string; // 'modules.general.name'
  readonly iconClass: string; // 'pi pi-cog'
  readonly defaultChildPath: string | null; // 'contactos' — destino de /t/:slug/general
  readonly requiredPlanFlag?: string; // futuro: 'plan_compra'
  readonly menu: readonly SidebarSection[]; // entradas del sidebar cuando es el activo
}
```

> **`ErpModuleDescriptor` vs `ModuleConfig`** — no confundirlos: `ModuleConfig` (en `core/module-config/`) describe los documentos transaccionales que alimentan al framework configuracional (camino A). `ErpModuleDescriptor` describe el módulo como contexto de navegación. Un módulo puede tener uno, el otro, o ambos. Coexisten sin solaparse.

#### 6.0.3 Registry y store

```ts
// apps/erp/src/app/core/erp-modules/erp-modules.registry.ts
export const ERP_MODULES: readonly ErpModuleDescriptor[] = [
  GENERAL_MODULE,
  COMPRA_MODULE,
  VENTA_MODULE,
  INVENTARIO_MODULE,
] as const;
```

Import estático: 4 descriptores pequeños sin componentes. Las páginas siguen siendo lazy vía `loadComponent` desde sus `<modulo>.routes.ts`.

`ActiveModuleStore` mantiene el id del módulo activo como signal. Lo escribe `erpModuleResolver(id)` puesto en la ruta raíz de cada módulo; lo leen el topbar (para highlight) y el sidebar (para filtrar).

```ts
// apps/erp/src/app/features/general/general.routes.ts
export const GENERAL_ROUTES: Route[] = [
  {
    path: '',
    resolve: { _module: erpModuleResolver('general') },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'contactos' },
      { path: 'contactos', loadComponent: () => ... },
    ],
  },
];
```

#### 6.0.4 Topbar (`ModuleBarComponent`)

Vive en `apps/erp/src/app/layouts/module-bar/`. Renderiza un link por cada módulo habilitado por `PermissionsService.canAccessModule(id)`. Cada link apunta a `/t/<slug>/<moduleId>`. Highlight al activo según `ActiveModuleStore.activeId()`.

#### 6.0.5 Sidebar filtrado

El sidebar lee `ActiveModuleStore.activeDescriptor().menu` y renderiza solo esa lista. Los paths declarados son **relativos al módulo** — el layout les prepende `/t/<slug>/<moduleId>/`. Empty state cuando no hay módulo activo (ej. `/t/:slug/dashboard`).

#### 6.0.6 Permisos por módulo

`PermissionsService` (en `apps/erp/src/app/core/permissions/`) decide qué módulos son accesibles. Implementación inicial: retorna todos los ids registrados — el backend aún no expone flags `plan_compra`, `plan_venta`, etc. en `Contenedor`. Cuando los exponga, solo cambia el `computed` interno; el contrato no.

### 6.A Camino "documentos": framework configuracional

Aplica a entidades transaccionales sobre el endpoint genérico `/api/documento`. Una constante declarativa describe la entidad y el framework la renderiza.

#### 6.A.1 Tipos

Ubicación: `libs/core/src/lib/documento/` (expuesto por `@reddoc/core`, consumido por erp y turnos)

```ts
// entity-config.types.ts

/**
 * Efecto del documento sobre el inventario.
 * `inflow`  aumenta stock (compra, devolución de venta).
 * `outflow` disminuye stock (venta, devolución de compra).
 */
export type InventoryEffect = 'inflow' | 'outflow';

/**
 * Capacidades del documento visibles en la UI.
 * Cada flag es independiente; declara lo que la entidad SOPORTA técnicamente.
 * La visibilidad final también depende de los permisos del usuario.
 */
export interface DocumentCapabilities {
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canSelectRows: boolean;
  readonly canExportExcel: boolean;
  readonly canExportZip: boolean;
  readonly canGenerate: boolean;
}

/** Rutas relativas al módulo. */
export interface EntityRoutes {
  readonly list: string;
  readonly new: string;
  readonly edit: string;
  readonly detail: string;
}

/**
 * Configuración de un documento transaccional.
 *
 * En v2.0, `EntityConfig` es exclusivamente `DocumentEntityConfig`.
 * Los masters NO viven en este tipo — son features directos (ver §6.B).
 */
export interface DocumentEntityConfig {
  readonly kind: 'document';
  readonly id: string; // 'factura-compra'
  readonly displayNameKey: string; // 'modules.compra.entities.factura.name'
  readonly endpoint: string; // '/api/documento'
  readonly documentTypeId: number; // 5 — único across todo el ERP
  readonly inventoryEffect: InventoryEffect;
  readonly schemaVersion: number; // Para invalidar localStorage
  readonly columns: readonly ColumnDef[];
  readonly filters: readonly FilterField[];
  readonly routes: EntityRoutes;
  readonly capabilities: DocumentCapabilities;
  readonly extraActionIds?: readonly string[];
}

export type EntityConfig = DocumentEntityConfig;
```

```ts
// module-config.types.ts

/** Módulo de negocio que contiene documentos transaccionales. */
export interface ModuleConfig {
  readonly id: string; // 'compra'
  readonly displayNameKey: string;
  readonly iconClass: string; // 'pi pi-shopping-cart'
  readonly documents: readonly DocumentEntityConfig[];
}
```

> Nota v2.0: el campo se renombra de `entities` a `documents` para reflejar que solo aloja documentos. Los masters viven en sus features.

#### 6.A.2 Registry (OCP)

```ts
// apps/erp/src/app/core/module-config/module-registry.constant.ts

export const ERP_MODULE_REGISTRY = {
  compra: () => import('../../features/compra/compra.config').then((m) => m.COMPRA_CONFIG),
  venta: () => import('../../features/venta/venta.config').then((m) => m.VENTA_CONFIG),
  inventario: () =>
    import('../../features/inventario/inventario.config').then((m) => m.INVENTARIO_CONFIG),
  // ... otros módulos con documentos
} as const satisfies ModuleRegistry;
```

Inyectado vía `MODULE_REGISTRY` token de `@reddoc/core`. El framework define el contrato; la app provee la instancia (DIP).

#### 6.A.3 Servicios

- **`ModuleRegistryService`** (`@reddoc/core`): carga `ModuleConfig` lazy desde el registry, cachea, valida.
- **`ModuleNavigationStore`** (`@reddoc/core`): signals `activeModule` y `activeDocument` escritos por los resolvers.

#### 6.A.4 Routing + resolvers

```ts
// apps/erp/src/app/features/compra/compra.routes.ts

export const COMPRA_ROUTES: Routes = [
  {
    path: '',
    resolve: {
      _navModule: erpModuleResolver('compra'),       // capa de navegación
      _docModule: activeModuleResolver('compra'),    // framework configuracional
    },
    children: [
      {
        path: ':documentKey',
        resolve: { document: activeDocumentResolver() },
        children: [
          {
            path: 'list',
            loadComponent: () =>
              import('../../core/module-config/components/base-document-list/base-document-list.component')
                .then((m) => m.BaseDocumentListComponent),
          },
          { path: 'new',         loadComponent: () => /* form */ },
          { path: 'edit/:id',    loadComponent: () => /* form */ },
          { path: 'detail/:id',  loadComponent: () => /* detail */ },
        ],
      },
    ],
  },
];
```

URLs resultantes (con `documentKey = factura-compra`):

```
/t/:slug/compra/factura-compra/list
/t/:slug/compra/factura-compra/new
/t/:slug/compra/factura-compra/edit/:id
/t/:slug/compra/factura-compra/detail/:id
```

> Notas v2.1:
>
> - El segmento intermedio `documento/` se eliminó. La URL pasa directo del módulo al `documentKey`.
> - El módulo expone **dos** resolvers en su raíz: `erpModuleResolver` (capa de navegación) y `activeModuleResolver` (registry del framework configuracional). Son ortogonales y coexisten.
> - `activeEntityResolver(kind)` se renombra a `activeDocumentResolver()` (sin parámetro) porque solo procesa documentos.

#### 6.A.5 `BaseDocumentListComponent`

Reemplaza al `BaseListComponent` de v1.1. Recibe `DocumentEntityConfig` por input. Internamente compone `<lib-data-table>` y `<lib-filter-panel>`. Delega I/O al `EntityDataGateway`.

```ts
@Component({ selector: 'lib-base-document-list' /* ... */ })
export class BaseDocumentListComponent {
  readonly document = input.required<DocumentEntityConfig>();
  // toolbar, columnas, paginación, etc. derivadas del config
}
```

#### 6.A.6 Strategy pattern para acciones extras

(Sin cambios respecto a v1.1.) Acciones como "Generar", "Recurrente" se registran como `EntityActionStrategy` con `multi: true` providers. El documento declara qué strategies usa por `id`.

### 6.B Camino "masters": features directos

Aplica a entidades administrativas con endpoint propio. Cada master vive como feature independiente.

#### 6.B.1 Anatomía de un master

```
apps/erp/src/app/features/general/
├── general.routes.ts                      · rutas con erpModuleResolver('general')
├── general.module-descriptor.ts           · ErpModuleDescriptor (id, displayName, menu del sidebar)
├── constants/
│   └── contactos.constants.ts             · columnas, row actions, toolbar actions
├── models/
│   └── contacto.model.ts                  · Contacto, ContactoPayload, ContactoListResponse
├── services/
│   └── contacto.service.ts                · extends BaseHttpService
└── pages/
    └── contactos-list/
        ├── contactos-list.component.ts    · página dedicada — orquesta el listado
        ├── contactos-list.component.html
        └── contactos-list.component.scss
```

URL del master: `/t/:slug/general/contactos`. Las rutas declaradas en `general.routes.ts` usan paths relativos (`'contactos'`) — el prefijo `/t/:slug/general/` lo aporta el routing padre. Igual en el descriptor: `menu` declara paths relativos al módulo (`path: 'contactos'`).

#### 6.B.2 Cómo se ve una página de master

```ts
@Component({
  selector: 'app-contactos-list',
  standalone: true,
  imports: [DataTableComponent, FilterPanelComponent, ToolbarActionsComponent],
  templateUrl: './contactos-list.component.html',
})
export class ContactosListComponent {
  private readonly service = inject(ContactoService);

  protected readonly columns: readonly ColumnDef[] = [
    {
      field: 'id',
      headerKey: 'modules.general.contacto.columns.id',
      type: 'number',
      width: '70px',
      align: 'right',
      sortable: true,
    },
    {
      field: 'nombre_corto',
      headerKey: 'modules.general.contacto.columns.nombre',
      type: 'text',
      sortable: true,
    },
    // ...
  ];

  protected readonly filters: readonly FilterField[] = [
    {
      name: 'cliente',
      displayNameKey: 'modules.general.contacto.filters.cliente',
      type: 'boolean',
    },
    {
      name: 'proveedor',
      displayNameKey: 'modules.general.contacto.filters.proveedor',
      type: 'boolean',
    },
    // ...
  ];

  protected readonly storageKey = 'general:contactos:v1';

  protected readonly items = signal<readonly Contacto[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);

  // Lógica de paginación, filtros, carga, etc.
  // Es código simple del feature, no del framework.
}
```

**Características**:

- Sin `EntityConfig`, sin registry, sin resolver. La página existe y se renderiza directamente.
- Compone los building blocks compartidos por inputs explícitos.
- Si necesita un campo extra o un comportamiento único, lo agrega en el mismo archivo sin tocar a otros features.

### 6.C Building blocks compartidos

Viven en `libs/feature-base/src/lib/` y los usan **ambos caminos**.

#### 6.C.1 `<lib-data-table>` — componente "tonto"

```ts
@Component({ selector: 'lib-data-table' /* ... */ })
export class DataTableComponent {
  readonly columns = input.required<readonly ColumnDef[]>();
  readonly items = input.required<readonly unknown[]>();
  readonly totalCount = input<number>(0);
  readonly loading = input<boolean>(false);
  readonly pageSize = input<number>(25);
  readonly currentPage = input<number>(0);
  readonly selectionMode = input<'none' | 'multiple'>('none');
  readonly selectedRows = input<readonly unknown[]>([]);
  readonly rowActions = input<readonly RowAction[]>([]);

  readonly pageChange = output<{ page: number; pageSize: number }>();
  readonly sortChange = output<readonly SortSpec[]>();
  readonly selectionChange = output<readonly unknown[]>();
  readonly rowActionInvoked = output<{ actionId: string; row: unknown }>();
}
```

Sin lógica de negocio. Sin HTTP. Sin storage. Solo render + eventos. Es la pieza más reusada del sistema.

#### 6.C.2 `<lib-filter-panel>` — UI de filtros

Recibe `FilterField[]` + condiciones actuales, emite condiciones nuevas. Sin conocimiento de a qué entidad pertenece.

#### 6.C.3 `<lib-toolbar-actions>` — botones del header

Recibe un array declarativo de acciones (`{ id, labelKey, icon, severity, disabled? }`), emite el id al hacer click. El consumidor decide qué hacer con cada uno.

#### 6.C.4 `EntityDataGateway` + `HttpEntityDataGateway`

Sigue valiendo para documentos. Para masters, también es útil — pero un master simple puede saltarlo y usar su `*Service` directo si no necesita testabilidad de gateway. **No es obligatorio para masters**.

#### 6.C.5 `EntityFilterStorageService` (refactor v2.0)

Cambio de firma: en v1.1 recibía `EntityConfig`. En v2.0 recibe `storageKey: string` directo.

```ts
@Injectable({ providedIn: 'root' })
export class EntityFilterStorageService {
  read(storageKey: string): readonly FilterCondition[] {
    /* ... */
  }
  write(storageKey: string, filters: readonly FilterCondition[]): void {
    /* ... */
  }
  clear(storageKey: string): void {
    /* ... */
  }
}
```

Cada llamador construye su clave: documentos vía helper `buildDocumentStorageKey(module, document)`, masters con un literal `'general:contactos:v1'`.

#### 6.C.6 Tipos compartidos

`ColumnDef`, `FilterField`, `ListQuery`, `ListResponse`, `FilterCondition`, `SortSpec`, `FilterOperator`. Viven en `@reddoc/core` para que cualquier feature los importe.

### 6.D Sidebar filtrado al módulo activo

El sidebar **no es global**: refleja exclusivamente el módulo activo según `ActiveModuleStore.activeDescriptor()`. Cuando cambias de módulo en el topbar, el sidebar reemplaza su contenido por el menú del módulo nuevo. Cuando no hay módulo activo (ej. `/t/:slug/dashboard`), muestra un empty state.

```ts
// apps/erp/src/app/features/general/general.module-descriptor.ts

export const GENERAL_MODULE: ErpModuleDescriptor = {
  id: 'general',
  displayNameKey: 'modules.general.name',
  iconClass: 'pi pi-cog',
  defaultChildPath: 'contactos',
  menu: [
    {
      kind: 'accordion',
      id: 'general-administracion',
      labelKey: 'layout.nav.sections.master',
      iconClass: 'pi pi-folder',
      groups: [
        {
          items: [
            { labelKey: 'entities.contacto.name', path: 'contactos' },
            // futuras: ítems, sedes, almacenes...
          ],
        },
      ],
    },
  ],
};
```

Los `path` de cada item son **relativos al módulo** — el `WorkspaceLayout` les prepende `/t/<slug>/<moduleId>/`.

Para módulos con documentos (camino A), el menú puede mezclar masters y documentos en acordeones distintos. Si el menú se vuelve repetitivo entre documentos (ej. uno por cada `DocumentEntityConfig` registrado), el descriptor puede derivar parte de su `menu` del `ModuleConfig` correspondiente — pero ese helper es opcional, no parte del contrato base.

Reemplaza al `SIDEBAR_MENU` global de v2.0, que se eliminó al cerrar la migración.

---

## 7. Convenciones de naming

Reglas que aplican a todo el código. Romperlas requiere justificación explícita en el PR.

### 7.1 General

| Categoría           | Convención                        | Ejemplo                                 |
| ------------------- | --------------------------------- | --------------------------------------- |
| Archivos            | `kebab-case`                      | `module-registry.service.ts`            |
| Clases / interfaces | `PascalCase`                      | `ModuleRegistryService`, `EntityConfig` |
| Constantes globales | `SCREAMING_SNAKE_CASE`            | `ERP_MODULE_REGISTRY`, `COMPRA_CONFIG`  |
| Funciones / métodos | `camelCase`, verbo primero        | `loadModule`, `setActiveDocument`       |
| Booleanos           | Prefijo `is`/`can`/`has`/`should` | `isLoading`, `canEdit`, `hasFilters`    |
| Signals             | Sin prefijo, snake o camel        | `activeDocument`, `items`               |
| Eventos / outputs   | Verbo en pasado                   | `documentSelected`, `actionInvoked`     |
| Inyección tokens    | `SCREAMING_SNAKE_CASE`            | `ENTITY_DATA_GATEWAY`                   |

### 7.2 Identificadores en el dominio

- Usa `id` (no `key`, `name`, `slug`) para identificadores estables que aparecen en URLs.
- `displayNameKey` para claves i18n. Nunca strings de UI literales en configs.
- Código y APIs en inglés; strings de UI en español/inglés vía i18n.

### 7.3 Path aliases

Para evitar imports relativos profundos (`../../../../../i18n`) ahora que los masters viven en `features/<modulo>/masters/<entity>/pages/<page>/`, se expone un alias intra-app:

```json
"@erp/*": ["apps/erp/src/app/*"]
```

Reglas de uso:

- **Cross-app (libs)**: `@reddoc/core`, `@reddoc/ui`, `@reddoc/feature-base` — como siempre.
- **Dentro del erp pero cross-feature**: `@erp/core/...`, `@erp/i18n`, `@erp/layouts/...`. Aplica cuando el import sale del bounded context actual.
- **Hermanos en el mismo bounded context (master / componente / feature)**: relativos cortos (`./contacto.service`, `../../contacto.model`). Refuerzan la idea de "esto vive cerca" y se mueven en bloque cuando se renombra la carpeta.

El alias `@erp/*` está permitido por una excepción explícita en `eslint.config.mjs` (regla `@nx/enforce-module-boundaries`). El resto del monorepo no tiene un alias equivalente — cada app sigue la convención Nx estricta hasta que su tamaño justifique flexibilizarla.

### 7.4 Anti-naming (prohibido)

- `data: any`, `params: any` → usar `unknown` + parseo, o tipar correctamente.
- `obj.modeloCofig` (typo del legacy) → revisar antes de commitear.
- `arrItems`, `objConfig` → notación húngara, prohibido.
- `_modelo`, `_tipo` (underscore prefix) → privado real con `private`.
- Funciones que devuelven `any` o `Promise<any>`.

---

## 8. Estructura por módulo

Dos patrones, según la naturaleza del módulo.

Todos los módulos comparten un mismo esqueleto: `<id>.module-descriptor.ts` (capa de navegación) + `<id>.routes.ts` con `erpModuleResolver('<id>')`. Lo que cambia es el contenido.

### 8.1 Módulo con documentos (camino A)

```
apps/erp/src/app/features/<id>/
├── <id>.routes.ts                    · rutas con erpModuleResolver + activeModuleResolver
├── <id>.module-descriptor.ts         · ErpModuleDescriptor con menu de documentos
├── <id>.config.ts                    · ModuleConfig exportado al framework configuracional
├── actions/                          · strategies del módulo
│   ├── <action>.action.ts
│   └── index.ts                      · provider() para registrar todas
└── i18n/                             · traducciones del módulo (cuando aplique)
```

Ejemplo: módulo `compra` con documentos Factura, Nota crédito, Nota débito, etc.

### 8.2 Módulo con masters (camino B)

Cada master es un **bounded context auto-contenido**: vive en su propia subcarpeta bajo `masters/<entity>/` con su modelo, servicio, constantes, rutas, páginas y opcionalmente componentes y utilidades específicas. Esta organización escala linealmente: agregar un master nuevo es agregar una carpeta, no contaminar carpetas planas globales.

```
apps/erp/src/app/features/<id>/
├── <id>.routes.ts                    · dispatcher: delega cada master a su <entity>.routes.ts
├── <id>.module-descriptor.ts         · ErpModuleDescriptor con menu de masters
├── shared/                           · solo si surge algo compartido entre masters del módulo
│   ├── types/
│   └── pipes/
└── masters/
    ├── <entity>/
    │   ├── <entity>.routes.ts        · rutas del master (list / new / edit / detail)
    │   ├── <entity>.model.ts
    │   ├── <entity>.service.ts       · extends BaseHttpService
    │   ├── <entity>.constants.ts     · columns, row actions, toolbar actions
    │   ├── pages/
    │   │   ├── <plural>-list/        · plural para la lista
    │   │   ├── <entity>-form/        · singular — compartido create+edit
    │   │   └── <entity>-detail/
    │   ├── components/               · solo si surgen (NO crear preventivo)
    │   └── utils/                    · lógica de negocio específica del master
    └── ...
```

**Regla**: lo que solo importa a un master vive dentro del master. Lo que dos masters del mismo módulo comparten sube a `<id>/shared/`. Lo que cruza módulos del ERP sube a `apps/erp/src/app/core/` o a una lib.

**Convenciones de naming**:

- Plural en carpetas de lista (`contactos-list/`, `asesores-list/`) — son colecciones.
- Singular en form/detail (`contacto-form/`, `asesor-detail/`) — son una entidad.
- Singular en modelos, servicios, constantes (`contacto.model.ts`, `asesor.service.ts`).
- Kebab-case siempre (`cuenta-banco/`, no `cuentaBanco/`).

Ejemplo: módulo `general` con masters Contacto, Ítem, Sede, Almacén, Cuenta banco, Asesor, Resolución.

### 8.3 Módulo mixto

Si un módulo tiene **documentos y masters**, combina las dos estructuras: el mismo `<id>.module-descriptor.ts` declara ambos en su `menu` (en grupos separados o acordeones distintos), y `<id>.routes.ts` registra rutas para ambos.

### 8.4 Cómo agregar un master nuevo (ejemplo: ítems en General)

1. Crear la carpeta `apps/erp/src/app/features/general/masters/item/` con:
   - `item.model.ts` — types `Item`, `ItemPayload`, `ItemListResponse`.
   - `item.service.ts` extendiendo `BaseHttpService` (endpoint propio).
   - `item.constants.ts` — `ITEM_COLUMNS`, `ITEM_ROW_ACTIONS`, `ITEM_PRIMARY_ACTION`, etc.
   - `item.routes.ts` — `ITEM_ROUTES` con lazy `loadComponent` por página.
   - `pages/items-list/items-list.component.{ts,html,scss}`.
2. En `general.routes.ts`, delegar la ruta:
   ```ts
   { path: 'items', loadChildren: () => import('./masters/item/item.routes').then(m => m.ITEM_ROUTES) }
   ```
   URL final: `/t/:slug/general/items`.
3. Sumar la entrada al `menu` del `general.module-descriptor.ts`:
   ```ts
   { labelKey: 'entities.item.name', path: 'items' }
   ```
4. Sumar las claves i18n (`entities.item.name`, `entities.item.columns.*`, etc.) en `app.es.ts` y `app.en.ts`.

Sin tocar el framework, sin tocar otros features, sin tocar otros masters.

### 8.5 Cómo agregar un documento nuevo (ejemplo: nota débito de venta)

1. Agregar el descriptor al array `documents` de `venta.config.ts`.
2. Si necesita una acción custom, registrar la strategy.
3. Sumar la entrada al `menu` del `venta.module-descriptor.ts`.

### 8.6 Cómo agregar un módulo nuevo

1. Crear `features/<id>/<id>.module-descriptor.ts` con su `ErpModuleDescriptor`.
2. Crear `features/<id>/<id>.routes.ts` con `erpModuleResolver('<id>')` y rutas hijas.
3. Sumarlo a `apps/erp/src/app/core/erp-modules/erp-modules.registry.ts`.
4. Sumar entrada `loadChildren` en `app.routes.ts` bajo `/t/:tenantSlug`.
5. Sumar claves i18n `modules.<id>.name` en `app.es.ts` / `app.en.ts`.

---

## 9. Manejo de errores y casos límite

### 9.1 Errores tipados

Clases de error específicas en lugar de `new Error('mensaje')` genérico. Permite que el `ErrorHandler` global reaccione apropiadamente (toast, redirect, etc.).

Conservados de v1.1 y aplicables al camino de documentos:

- `UnknownModuleError`
- `ConfigMismatchError`
- `DuplicateEntityIdError`
- `MissingModuleContextError`
- `MissingDocumentKeyError` (renombrado desde `MissingEntityKeyError`)
- `DocumentNotFoundError` (renombrado desde `EntityNotFoundError`)

Para masters no se necesitan errores especiales — los servicios HTTP propagan errores estándar de `HttpClient`.

### 9.2 Boundary de errores en el router

`ConfigErrorHandler` captura errores de resolvers de documentos y redirige a `/not-found` o muestra un toast. Los masters usan el manejo de errores de su propio servicio HTTP.

### 9.3 Validación de configs en build

Script Nx `validate-configs` que:

- Importa todas las configs de documentos registradas.
- Verifica que `documentTypeId` sea único across módulos.
- Verifica que cada `extraActionIds` referenciado exista en algún archivo de strategy.
- Verifica que las claves i18n existan en los diccionarios.

Corre en pre-commit y CI.

---

## 10. Estrategia de testing

### 10.1 Cobertura mínima por capa

| Capa                                     | Tipo de test                     | Cobertura objetivo           |
| ---------------------------------------- | -------------------------------- | ---------------------------- |
| Tipos (compile-time)                     | `tsc --strict`                   | 100% (forzado)               |
| `ModuleRegistryService`                  | Unit                             | 100%                         |
| `ModuleNavigationStore`                  | Unit                             | 100%                         |
| Resolvers de documentos                  | Unit + integration               | 100% paths felices + errores |
| `HttpEntityDataGateway`                  | Unit con `HttpTestingController` | 100% de métodos              |
| `EntityFilterStorageService`             | Unit                             | 100% (incluye corrupción)    |
| `BaseDocumentListComponent`              | Component test con gateway fake  | flujos principales           |
| `<lib-data-table>`, `<lib-filter-panel>` | Component test                   | inputs/outputs + edge cases  |
| Servicios de masters (`*Service`)        | Unit con `HttpTestingController` | métodos públicos             |
| Páginas de masters (`*-list.component`)  | Component test                   | flujo de página              |
| Configs de documentos                    | Validation script                | 100% en CI                   |

### 10.2 Fakes en lugar de mocks

Para `EntityDataGateway` mantenemos una implementación **en memoria** real en `libs/feature-base/testing/`:

```ts
export class InMemoryEntityDataGateway implements EntityDataGateway {
  private store = new Map<string, unknown[]>();
  // implementación real
}
```

Tests más legibles y verifican interacciones reales, no comportamientos espiados.

---

## 11. Trade-offs aceptados

### 11.1 Para documentos (camino A)

**Ganamos**:

- Onboarding de documento nuevo: 1 objeto en el array `documents` de su módulo.
- Type-safety end-to-end sin `any`.
- Lazy load real por módulo.
- Una sola implementación de lista/form/detalle para los 14+ tipos de documento.
- Strategies para acciones custom — extensibilidad sin tocar `BaseDocumentList`.

**Pagamos**:

- Indirección: para entender `/compra/documento/factura-compra/list` hay que leer routing + config + `BaseDocumentList`.
- Curva de aprendizaje del framework — ~1-2 días para un dev nuevo.
- Foundation upfront (~1,000 LoC de scaffolding) ya pagada en v1.1.

### 11.2 Para masters (camino B)

**Ganamos**:

- Cada master es completamente independiente — modificar uno no afecta a otros.
- Lectura directa: ver lo que hace un master no requiere conocer el framework.
- UX flexible — agregar campos custom, validaciones especiales, layouts distintos sin escape hatches.
- Onboarding inmediato: un dev escribe un master nuevo en una sesión.

**Pagamos**:

- Cierto código repetido entre masters (la estructura "página con tabla + filtros + servicio HTTP" se replica).
- La repetición es manejable porque los building blocks (`<lib-data-table>`, `<lib-filter-panel>`) absorben el 80%.

### 11.3 Cuándo **no** usar ninguno de los dos caminos

Algunas features no son CRUD y deben quedarse como features tradicionales sin building blocks de tabla:

- **`contenedores`** — selección de tenant pre-workspace.
- **`dashboard`** — KPIs, gráficos, vistas custom.
- **Settings de usuario** — formularios únicos por sección.
- **Wizards, builders, configuradores** — flujos no-CRUD.

---

## 12. Plan de migración

Estado actual (commit `fcdb96f`): foundation v1.1 implementada con `BaseListComponent` unificado que ramifica por `kind` y módulo `general` registrado como `kind: 'master'`. Pasamos a v2.0 sin tirar lo aprovechable.

| Paso | Alcance                                                                                                                                   | Riesgo |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Crear `<lib-data-table>` standalone tonto al lado del `BaseListComponent` actual. No toca nada existente.                                 | Bajo   |
| 2    | Refactorizar `EntityFilterStorageService` para aceptar `storageKey: string` directo (cambio compatible: ambas firmas conviven).           | Bajo   |
| 3    | Crear `ContactoService` (extends `BaseHttpService`) + `ContactosListComponent` que compone `<lib-data-table>` + servicio.                 | Bajo   |
| 4    | Crear `sidebar-menu.ts` y modificar `WorkspaceLayoutComponent` para mezclar items declarativos + acordeones del registry de documentos.   | Medio  |
| 5    | Mover la entrada "Contactos" del menú: del registry de v1.1 al menú declarativo. La ruta apunta a la página nueva.                        | Bajo   |
| 6    | Quitar `general` del `ERP_MODULE_REGISTRY` y eliminar `general.config.ts` (la entidad `contacto` ya no es del framework).                 | Bajo   |
| 7    | Limpiar el framework: eliminar `MasterEntityConfig`, `MasterCapabilities`, `UtilityEntityConfig`. `EntityConfig` queda solo documentos.   | Medio  |
| 8    | Renombrar `BaseListComponent` → `BaseDocumentListComponent`. Quitar narrowing por `kind`. Simplificar resolvers y gateway.                | Medio  |
| 9    | Renombrar `activeEntityResolver(kind)` → `activeDocumentResolver()` sin parámetro. Renombrar errores de "entity" a "document".            | Bajo   |
| 10   | Validar end-to-end: contactos como feature directo; framework listo para el primer documento real cuando se sume un módulo transaccional. | Bajo   |

Cada paso queda en su commit, así puedes revisar el diff o revertir individualmente.

**No se migra**: `contenedores`, `dashboard`, `auth`. Siguen como features tradicionales.

---

## 13. Decisiones tomadas

### 13.1 Ubicación de los componentes y building blocks

**Decisión revisada** (post-v2.0 reorg, 2026-05-12): el código se reparte por **alcance real**, no por convención Nx.

- **`libs/feature-base/`** — building blocks tontos verdaderamente cross-app: hoy `DataTableComponent`. Cuando aparezcan `<lib-filter-panel>` y `<lib-toolbar-actions>` también vivirán aquí.
- **`libs/core/src/lib/data-list/`** — tipos y helpers cross-app de listados: `ColumnDef`, `FilterField`, `ListQuery`, `serializeListQuery`, `FilterStorageService`.
- **`libs/core/src/lib/documento/`** — núcleo **compartido** del framework (lo consumen erp y turnos vía `@reddoc/core`): tipos `DocumentEntityConfig`/`ModuleConfig`/`EntityConfig`, `ENTITY_DATA_GATEWAY` + `HttpEntityDataGateway`, `DocumentoDetalleService`, `DOCUMENT_TYPE_ID`.
- **`apps/erp/src/app/core/module-config/`** — lo **ERP-específico** del framework: `MODULE_REGISTRY`, `ModuleRegistryService`, resolvers, `ModuleNavigationStore`, acciones extra, `buildEntityStorageKey`, importar-documento, errores, y `BaseDocumentListComponent` bajo `components/base-document-list/`. Su `index.ts` re-exporta los tipos/gateway desde `@reddoc/core`, así que los consumidores del erp siguen importando de `@erp/core/module-config`.

**Por qué la reorganización**: el dominio "módulos del ERP con documentos transaccionales sobre `/api/documento`" es exclusivo del ERP. POS, cuenta, transporte y demás apps no tienen este patrón. Forzarlo a vivir en `libs/core` mezclaba infra cross-app con dominio ERP, contaminando la lib y dejando puerta a importar piezas que esas apps nunca usarían. Las **piezas genuinamente cross-app** (tabla tonta, tipos de columna, query serialization, filter storage) sí se quedan en libs porque tienen reuso real.

**Regla práctica**: lo que ES cross-app va en `libs/`. Lo que es ERP-específico vive en `apps/erp/src/app/core/`.

**Nota técnica**: `BaseDocumentListComponent` se importa siempre vía `loadComponent` desde las rutas de documentos. **No** se exporta desde `apps/erp/src/app/core/module-config/index.ts` para evitar que PrimeNG (table, confirm dialog) entre al bundle inicial.

### 13.2 Granularidad de i18n

**Decisión**: por módulo, con namespace embebido por entidad / master.

```
modules.compra.entities.factura.name        → 'Factura de compra'
modules.general.contacto.columns.nombre     → 'Nombre'
modules.general.contacto.filters.cliente    → 'Cliente'
common.actions.new                          → 'Nuevo'
common.actions.delete                       → 'Eliminar'
```

Las claves comunes (botones "Guardar", "Cancelar", toasts genéricos) viven en `common.*`.

### 13.3 Sistema de permisos

**Decisión**: dos niveles — por ruta (acceso) y por capacidad (UI).

- **Acceso al módulo / ruta**: guards de Angular leen el rol del usuario contra una matriz `module → role`. Bloquea la ruta entera.
- **Capacidades dentro de la UI**: el componente consulta `PermissionsService.can('compra.factura.create')` antes de mostrar un botón. El config `capabilities.canCreate` declara qué es **técnicamente posible**; el service decide qué le es **permitido al usuario actual**.

Implementación inicial: `PermissionsService` con signal estático cargado en `provideAppInitializer`. Cuando el backend exponga API de permisos granulares, solo cambia la fuente — el contrato del servicio no.

### 13.4 Vistas alternativas (kanban, calendar, etc.)

**Decisión**: no soportar inicialmente. Cuando emerja la necesidad:

- En **documentos**: agregar `defaultView: 'list' | 'kanban' | 'calendar'` al `DocumentEntityConfig` y crear `BaseDocumentKanbanComponent` en `libs/feature-base/`.
- En **masters**: cada feature ya es libre de renderizar lo que quiera; agrega su propia página `<master>-kanban/`.

### 13.5 Enfoque híbrido (nueva en v2.0)

**Decisión**: framework configuracional solo para documentos transaccionales; masters como features directos.

**Razones**:

- El backend ya está separado para masters (cada uno con su endpoint). El framework asume un patrón de acceso uniforme que solo se cumple en documentos.
- Las diferencias entre masters son **estructurales** (cada uno con su shape, su UX), no solo de capacidades. Forzarlos a una abstracción común introduce indirección sin beneficio.
- Conservar el framework donde el reuso es real (documentos) y retirarlo donde no lo era (masters) reduce ~600 LoC de scaffolding y elimina escape hatches.

**Implicaciones**:

- `EntityConfig` se vuelve sinónimo de `DocumentEntityConfig`.
- `BaseListComponent` se renombra a `BaseDocumentListComponent` y se simplifica.
- Cada master implementa su listado componiendo building blocks.

### 13.6 Módulos como contexto de navegación (nueva en v2.1)

**Decisión**: el ERP organiza la navegación en módulos visibles en un topbar; el módulo activo deriva del primer segmento de la URL post-tenant; el sidebar se filtra al módulo activo.

**Patrón de URL**:

```
/t/:tenant/<modulo>/<master>                  masters administrativos
/t/:tenant/<modulo>/<documento>/list          documentos transaccionales
```

Se descarta el segmento intermedio `documento/` que proponía v2.0 — innecesario una vez que el módulo es contexto y no decoración.

**Razones**:

- Sin "módulo como contexto" no había forma de agrupar entidades de negocio. Tener `/t/:slug/contactos` al lado de `/t/:slug/factura-compra` rompía el mental model que el legacy había establecido.
- El sidebar único proponía 6.D v2.0 escalaba mal: con 8+ módulos y 30+ entidades en total, era una lista insostenible. Filtrar al módulo activo (estilo legacy) reduce el ruido visual sin perder discoverability — el topbar siempre muestra los módulos disponibles.
- Permisos por plan del tenant: el legacy filtraba módulos por plan (`plan_compra`, `plan_venta`, etc.). `PermissionsService` deja la puerta abierta sin acoplarse al backend hoy.

**Implicaciones**:

- Cada módulo aporta su `ErpModuleDescriptor` y su `<id>.routes.ts` con `erpModuleResolver('<id>')`.
- `SIDEBAR_MENU` global se elimina. El sidebar lee `ActiveModuleStore.activeDescriptor().menu`.
- Se introduce `ModuleBarComponent` en el header del `WorkspaceLayout`.
- Se introduce `PermissionsService` (stub que retorna todos los módulos por ahora).
- Las URLs viejas (ej. `/t/:slug/contactos`) se rompen — se rediseña la migración para que toda master quede bajo su módulo desde el primer momento.

**Relación con el framework configuracional**:

- `ErpModuleDescriptor` (capa de navegación) y `ModuleConfig` (capa de datos del framework configuracional) son **ortogonales**. Un módulo con documentos expone ambos: el descriptor define topbar/sidebar; el `ModuleConfig` describe el shape de cada documento.
- Un módulo solo-masters (General) expone solo el descriptor.
- Un módulo solo-documentos expone ambos pero el `menu` se puede generar desde el `ModuleConfig`.

---

## 14. Referencias

### Legacy estudiado

- `/home/tamerlan/Desktop/semantica/app.reddoc/` — Angular 17
  - `src/app/modules/compra/domain/constantes/configuracion.constant.ts`
  - `src/app/comun/services/application/config-modulo.service.ts`
  - `src/app/comun/componentes/base-documento/base-lista/base-lista.component.ts`
  - `src/app/comun/componentes/base-administracion/base-lista/base-lista.component.ts`

### Nuevo

- `/home/tamerlan/Desktop/reddoc-monorepo/`
  - `apps/erp/` — aplicación destino
  - `libs/core/` — tipos, registry, services, resolvers, gateway, errores
  - `libs/feature-base/` — building blocks tontos + componentes base de documentos
  - `libs/ui/` — componentes de presentación pura (auth, avatares, toggles)

### Conceptos

- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **YAGNI**: "You aren't gonna need it"
- **Strategy pattern**: Gamma et al., "Design Patterns"
- **Configuration-driven architecture**: variante de "Data-Driven UI" (aplica solo a documentos en v2.0)
- **Discriminated unions en TS**: handbook oficial — narrowing por propiedad común (aplica al campo `kind` de `DocumentEntityConfig`, que en v2.0 tiene una sola variante pero queda como hook para futuras extensiones)

---

## Historial de versiones

- **v1.0** (2026-05-11): primera propuesta — framework configuracional uniforme para documentos y masters.
- **v1.1** (2026-05-11): revisión SOLID — discriminated unions, registry, signals, resolvers, gateway, strategies.
- **v2.0** (2026-05-12): enfoque híbrido tras implementación de v1.1 — documentos siguen configuracionales, masters pasan a features directos.
- **v2.1** (2026-05-13): módulos como contexto de navegación — topbar de módulos en el header, sidebar filtrado al módulo activo, URL `/t/:slug/<modulo>/<entidad>`, `PermissionsService` para visibilidad por plan. Cierra una omisión de v2.0 que dejaba a los masters montados directos bajo el tenant sin contexto de módulo.
