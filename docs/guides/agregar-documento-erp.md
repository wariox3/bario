# Guía: agregar un documento al ERP (camino A — framework configuracional)

> **Para quién**: dev que necesita sumar un documento transaccional (nota crédito,
> nota débito, factura POS, contrato, movimiento…) a un módulo del ERP.
> **Qué es "camino A"**: documentos que viven sobre el **endpoint genérico**
> `/api/general/documento`, discriminados por `documento_tipo_id`. Comparten schema,
> flujo y filtros; por eso se describen con un **`DocumentEntityConfig` declarativo** en
> vez de escribir un componente por documento.
> **Cuándo NO usar esto**: si la entidad tiene su **propio endpoint REST** (contacto,
> ítem, sede…) es un **master (camino B)** — ver `agregar-modulo-erp.md` → Paso B.
> El _por qué_ de todo esto: [`../architecture/erp-module-architecture.md`](../architecture/erp-module-architecture.md).

---

## Modelo mental en 30 segundos

Un documento **no tiene componente propio**: declarás un `DocumentEntityConfig` y el
genérico **`BaseDocumentListComponent`** lo renderiza (tabla + toolbar + filtros +
breadcrumb + card, todo derivado del config y sus `capabilities`).

```
DOCUMENT_TYPE_ID.X            ← el id del backend, sin magic numbers
   │
<doc>.config.ts               ← DocumentEntityConfig (columnas, filtros, capabilities, rutas)
   │  se suma a…
<modulo>.config.ts            ← ModuleConfig.documents[]
   │  registrado en…
ERP_MODULE_REGISTRY           ← carga lazy del ModuleConfig
   │
<doc>.routes.ts               ← activeDocumentResolver('<doc>') + BaseDocumentListComponent
   │  delegado desde…
<modulo>.routes.ts            ← loadChildren  (+ activeModuleResolver en la raíz)
   │
<modulo>.module-descriptor.ts ← entrada en el menú del sidebar
```

El **gateway** (`HttpEntityDataGateway`) hace `POST <endpoint>/lista/` e **inyecta solo**
`{ propiedad: 'documento_tipo_id', operador: '=', valor: documentTypeId }` como primer
filtro — el config nunca lo declara. El `endpoint` **no** lleva el sufijo `/lista/` ni
`/eliminar/`; el gateway lo agrega.

Ejemplo canónico vivo: `features/venta/documentos/` → `factura-venta/` (CRUD completo) y
`contrato-servicio/` (solo lista).

---

## Caso 1 (el común): agregar un documento a un módulo que YA tiene documentos

Ejemplo: agregar **Nota crédito de venta** al módulo `venta` (que ya tiene
`VENTA_CONFIG` y documentos).

### 1. Registrar el `documento_tipo_id`

`core/module-config/constants/document-types.constants.ts` — añadí la entrada con su
nombre semántico (nada de magic numbers):

```ts
export const DOCUMENT_TYPE_ID = {
  FACTURA_VENTA: 1,
  CONTRATO_SERVICIO: 34,
  NOTA_CREDITO_VENTA: 4, // ← el id real del catálogo `documento_tipo` del backend
} as const satisfies Readonly<Record<string, number>>;
```

### 2. Crear el bounded context del documento

Carpeta `features/venta/documentos/nota-credito-venta/` con **3 archivos**:

**`nota-credito-venta.constants.ts`** — columnas y filtros visibles. Los `field` deben
coincidir con el shape del endpoint `general/documento/` (`numero`, `fecha`,
`contacto_nombre`, `estado_nombre`, `total`, …):

```ts
import type { ColumnDef, FilterField } from '@reddoc/core';

export const NOTA_CREDITO_VENTA_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'numero',
    headerKey: 'entities.notaCreditoVenta.columns.numero',
    type: 'text',
    width: '120px',
    sortable: true,
  },
  {
    field: 'fecha',
    headerKey: 'entities.notaCreditoVenta.columns.fecha',
    type: 'date',
    width: '110px',
    sortable: true,
  },
  {
    field: 'contacto_nombre',
    headerKey: 'entities.notaCreditoVenta.columns.contacto',
    type: 'text',
    sortable: true,
  },
  {
    field: 'total',
    headerKey: 'entities.notaCreditoVenta.columns.total',
    type: 'number',
    width: '120px',
    align: 'right',
  },
];

// Vacío = solo el filtro implícito documento_tipo_id (lo inyecta el gateway).
// Cada FilterField aquí enciende automáticamente el botón "Filtros" + el modal.
export const NOTA_CREDITO_VENTA_FILTERS: readonly FilterField[] = [
  { name: 'numero', displayNameKey: 'entities.notaCreditoVenta.columns.numero', type: 'string' },
];
```

**`nota-credito-venta.config.ts`** — el `DocumentEntityConfig`:

```ts
import { DOCUMENT_TYPE_ID, type DocumentEntityConfig } from '@erp/core/module-config';
import {
  NOTA_CREDITO_VENTA_COLUMNS,
  NOTA_CREDITO_VENTA_FILTERS,
} from './nota-credito-venta.constants';

export const NOTA_CREDITO_VENTA_CONFIG: DocumentEntityConfig = {
  kind: 'document',
  id: 'nota-credito-venta', // kebab-case, estable en URLs
  displayNameKey: 'entities.notaCreditoVenta.name',
  endpoint: '/api/general/documento', // SIN /lista/ ni /eliminar/
  documentTypeId: DOCUMENT_TYPE_ID.NOTA_CREDITO_VENTA,
  inventoryEffect: 'inflow', // metadata para form/inventario
  schemaVersion: 1, // ++ si cambia el shape de filtros
  columns: NOTA_CREDITO_VENTA_COLUMNS,
  filters: NOTA_CREDITO_VENTA_FILTERS,
  routes: {
    // relativas al módulo; las 4 son obligatorias
    list: 'nota-credito-venta/list',
    new: 'nota-credito-venta/nuevo',
    edit: 'nota-credito-venta/editar',
    detail: 'nota-credito-venta/detalle',
  },
  capabilities: {
    // ver "Capabilities" abajo
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canSelectRows: true,
    canExportExcel: false,
    canExportZip: false,
    canGenerate: false,
  },
};
```

**`nota-credito-venta.routes.ts`** — resolver + carga del genérico:

```ts
import type { Route } from '@angular/router';
import { activeDocumentResolver } from '@erp/core/module-config';

export const NOTA_CREDITO_VENTA_ROUTES: Route[] = [
  {
    path: '',
    resolve: { document: activeDocumentResolver('nota-credito-venta') },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'list' },
      {
        path: 'list',
        loadComponent: () =>
          import('@erp/core/module-config/components/base-document-list/base-document-list.component').then(
            (m) => m.BaseDocumentListComponent,
          ), // ← SIEMPRE por loadComponent, NUNCA por barrel
      },
      // CRUD: agregá nuevo / editar/:id / detalle/:id apuntando a su form/detalle
      // (o al ModulePlaceholderComponent mientras no exista). Solo-lista: omitilos.
    ],
  },
];
```

> **`loadComponent`, no barrel.** El `BaseDocumentListComponent` se importa siempre por
> ruta directa para no jalar PrimeNG al bundle inicial — por eso no está exportado en
> `core/module-config/index.ts`.

### 3. Sumar el config al módulo

`features/venta/venta.config.ts`:

```ts
import { NOTA_CREDITO_VENTA_CONFIG } from './documentos/nota-credito-venta/nota-credito-venta.config';

export const VENTA_CONFIG: ModuleConfig = {
  id: 'venta',
  displayNameKey: 'modules.venta.name',
  iconClass: 'pi pi-tag',
  documents: [FACTURA_VENTA_CONFIG, CONTRATO_SERVICIO_CONFIG, NOTA_CREDITO_VENTA_CONFIG], // ←
};
```

### 4. Delegar la ruta en el módulo

`features/venta/venta.routes.ts` — otra entrada `loadChildren` (la raíz ya encadena
`erpModuleResolver('venta')` + `activeModuleResolver('venta')`, no se toca):

```ts
{
  path: 'nota-credito-venta',
  loadChildren: () =>
    import('./documentos/nota-credito-venta/nota-credito-venta.routes')
      .then((m) => m.NOTA_CREDITO_VENTA_ROUTES),
},
```

URL final: `/t/:slug/venta/nota-credito-venta/list`.

### 5. Entrada en el sidebar

`features/venta/venta.module-descriptor.ts` — sumá el leaf al grupo del acordeón que
corresponda (path **relativo al módulo**):

```ts
{ labelKey: 'entities.notaCreditoVenta.name', path: 'nota-credito-venta/list' }
```

### 6. i18n (los 3 archivos en sincronía)

El diccionario es **estrictamente tipado**: agregá la misma estructura en `app.dict.ts`
(tipos), `app.es.ts` y `app.en.ts` (textos) o el build falla.

```ts
// app.dict.ts → entities:
notaCreditoVenta: {
  name: string;
  columns: {
    numero: string;
    fecha: string;
    contacto: string;
    total: string;
  }
}
```

```ts
// app.es.ts → entities:
notaCreditoVenta: {
  name: 'Nota crédito',                  // solo la 1ª palabra en mayúscula
  columns: { numero: 'Número', fecha: 'Fecha', contacto: 'Contacto', total: 'Total' },
},
```

```ts
// app.en.ts → entities:
notaCreditoVenta: {
  name: 'Credit note',
  columns: { numero: 'Number', fecha: 'Date', contacto: 'Contact', total: 'Total' },
},
```

**Listo.** `lint` + `build` + `serve` y el documento aparece en su módulo.

---

## Caso 2: el módulo todavía NO tiene documentos (es su primer documento)

Además de los 6 pasos de arriba, una sola vez por módulo:

1. **Crear `features/<modulo>/<modulo>.config.ts`** exportando
   `<MODULO>_CONFIG: ModuleConfig` con `documents: [<primer doc>]`.
2. **Registrar el módulo** en `core/module-config/module-registry.constant.ts`:
   ```ts
   export const ERP_MODULE_REGISTRY = {
     venta: () => import('../../features/venta/venta.config').then((m) => m.VENTA_CONFIG),
     compra: () => import('../../features/compra/compra.config').then((m) => m.COMPRA_CONFIG), // ← nuevo
   } as const satisfies ModuleRegistry;
   ```
3. **Encadenar `activeModuleResolver`** en la raíz de `<modulo>.routes.ts` junto al
   `erpModuleResolver` (este último ya existía para la navegación):
   ```ts
   resolve: {
     _navModule: erpModuleResolver('compra'),     // topbar + sidebar
     _docModule: activeModuleResolver('compra'),  // carga COMPRA_CONFIG → ModuleNavigationStore
   },
   ```

> Sin `activeModuleResolver`, el `activeDocumentResolver` del documento lanza
> `MissingModuleContextError` (no encuentra el `ModuleConfig` cargado).

---

## Capabilities — qué prende cada flag

`capabilities` es lo que el `BaseDocumentListComponent` lee para decidir qué mostrar.
Todas las que no apliquen van en `false`.

| Flag             | Efecto en la UI del listado                                      |
| ---------------- | ---------------------------------------------------------------- |
| `canCreate`      | Botón **"Nuevo"** en el toolbar → navega a la ruta `new`.        |
| `canEdit`        | Acción **"Editar"** en el menú de fila → ruta `edit`.            |
| `canDelete`      | Acción **"Eliminar"** de fila + botón contextual "Eliminar (N)". |
| `canSelectRows`  | Checkboxes de selección múltiple.                                |
| `canExportExcel` | (futuro) export. Hoy sin soporte en el gateway.                  |
| `canExportZip`   | (futuro) export ZIP.                                             |
| `canGenerate`    | (futuro) acción "Generar" (vía `extraActionIds`).                |

- **Documento solo-lista** (como `contrato-servicio`): **todas en `false`** y en
  `routes.ts` declarás solo `list` + redirect. El genérico muestra solo card + tabla
  (sin toolbar). Las 4 rutas igual van en el config porque el tipo `EntityRoutes` las
  exige, pero `new/edit/detail` nunca se navegan.
- **Documento CRUD** (como `factura-venta`): `canCreate/canEdit/canDelete/canSelectRows`
  en `true` y rutas `nuevo/editar/detalle` cableadas (hoy apuntan al placeholder hasta
  que exista el form/detalle).
- Los filtros **no** son un capability: con que `filters: []` tenga ≥1 `FilterField`,
  el botón "Filtros" + el modal aparecen solos.

---

## Checklist

- [ ] `documento_tipo_id` en `DOCUMENT_TYPE_ID` (nombre semántico).
- [ ] Carpeta `documentos/<doc>/` con `.constants.ts`, `.config.ts`, `.routes.ts`.
- [ ] Config sumado a `<modulo>.config.ts` → `documents[]`.
- [ ] `loadChildren` del documento en `<modulo>.routes.ts`.
- [ ] Leaf en el `menu` del `<modulo>.module-descriptor.ts`.
- [ ] i18n `entities.<doc>.*` en `app.dict.ts` + `app.es.ts` + `app.en.ts`.
- [ ] (Primer documento del módulo) `<modulo>.config.ts` + entrada en
      `ERP_MODULE_REGISTRY` + `activeModuleResolver` en la raíz de las rutas.
- [ ] `BaseDocumentListComponent` cargado por `loadComponent` (no barrel).
- [ ] `npx nx lint erp` y `npx nx build erp` en verde (el chunk del documento sigue lazy).
- [ ] `npx nx serve erp` (4201): el documento aparece en el sidebar, la lista carga
      (revisar en Network el `POST /api/general/documento/lista/` con el filtro
      `documento_tipo_id` inyectado).

---

## Referencias

- Cómo agregar un **módulo** (y masters/camino B): [`agregar-modulo-erp.md`](./agregar-modulo-erp.md)
- Arquitectura completa (el _por qué_): [`../architecture/erp-module-architecture.md`](../architecture/erp-module-architecture.md)
- Ejemplos vivos: `features/venta/documentos/factura-venta/` (CRUD) y
  `contrato-servicio/` (solo lista).
