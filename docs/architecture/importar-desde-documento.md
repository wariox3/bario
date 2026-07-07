# Importar desde documento — plan de diseño (ERP)

> Estado: **borrador de plan** · No hay código todavía. Este documento define el qué,
> el por qué y el cómo antes de escribir una sola línea. Lo iremos refinando por partes.

602 890 0989 - 318 360 9536

## 1. Objetivo

Permitir que, al crear/editar un documento comercial (p. ej. **factura de venta**), el usuario
**traiga líneas de detalle pendientes desde otro documento origen** (remisión, pedido,
cuenta de cobro, etc.) hacia el `FormArray` de detalles del documento actual.

Es el reemplazo, repensado con la arquitectura del monorepo, del flujo legacy
"Importar/Agregar desde documento".

## 2. Decisiones tomadas

| Decisión                  | Elección                             | Implicación                                                                                                                                                                         |
| ------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estrategia de importación | **Client-side (Flujo B del legacy)** | Las líneas se traen al `FormArray` como filas nuevas, editables, sin persistir hasta guardar el documento. Se conserva el vínculo a la línea origen (`documento_detalle_afectado`). |
| Ubicación                 | **`apps/erp/src/app/core/`**         | Es ERP-específico (acoplado a `/api/documento` discriminado por `documento_tipo_id` y al concepto de líneas comerciales). No va a `libs/`.                                          |

### 2.1 Por qué client-side y no server-side

El legacy tenía dos botones:

- **Flujo A (server-side merge)** — `agregar-detalles-documento`: el backend copiaba las líneas
  (`POST .../agregar_documento_detalle/`) y el front recargaba todo el formulario. Requiere
  documento ya guardado y deja al usuario sin oportunidad de revisar/ajustar antes de persistir.
- **Flujo B (client-side import)** — `buscar-documento-detalles`: trae las líneas pendientes al
  formulario como filas nuevas, con `cantidad = cantidad_pendiente` y
  `documento_detalle_afectado_id` apuntando a la línea origen. El usuario revisa, ajusta cantidades
  y recién al guardar se persiste todo junto.

Elegimos **B** porque:

- Funciona igual en alta y en edición (no exige documento persistido).
- Da control al usuario antes de comprometer datos.
- Encaja con el modelo actual del ERP: en alta los detalles viajan embebidos en la cabecera; en
  edición se transaccionan línea por línea contra `/documento-detalle`. En ambos casos "importar"
  es simplemente **poblar el `FormArray`**; la persistencia ya está resuelta por el flujo existente.

## 3. Cómo funcionaba en el legacy (referencia)

Ruta: `app.reddoc/src/app/comun/componentes/factura/components/formulario-productos/`

- En la barra de la tabla de detalles había un botón que abría un modal con
  `<app-buscar-documento-detalles>` (tabla paginada + filtros).
- El modal consultaba `general/documento_detalle/` con query params:
  `serializador: 'lista_agregar'`, `documento__documento_tipo_id`, `cantidad_pendiente: True`,
  `documento__contacto_id`, `documento__estado_aprobado: True`.
- El usuario marcaba líneas con checkboxes.
- Al "Agregar": por cada línea se hacía `POST general/item/detalle/` (forkJoin) para traer el
  detalle del ítem, y se construía un objeto enriquecido con:
  - `documento_detalle_afectado_id` = id de la línea origen.
  - `cantidad` = `cantidad_pendiente`.
- Se emitía el array al padre, que agregaba **cada línea como fila nueva** en el `FormArray`.

Problemas del legacy a NO repetir: `any` por todos lados, métodos vacíos, mutación de signals sin
`.set()`, dos componentes casi duplicados (A y B), `console.log` de debug, bug en el destructuring
`map(({item}) => ...)`.

## 4. Arquitectura propuesta (monorepo)

Piezas existentes que reutilizamos (no reinventar):

- **Tabla de detalles actual**: `features/documentos/comercial/components/comercial-documento-detalles/`
  — es el equivalente nuevo de `formulario-productos`. Recibe el `FormArray<ComercialDetalleGroup>`
  por input y ya sabe `addLinea()` / `removeLinea()` / cálculo reactivo vía `@reddoc/core/calculo`.
- **Form de línea**: `ComercialDetalleGroup` (`comercial-documento-detalle.form.ts`).
- **Tabla genérica**: `DataTableComponent` (`@reddoc/feature-base`) con `ColumnDef`/`FilterField`,
  selección múltiple (`selectionMode='multiple'`, `selectionChange`), paginación y orden.
- **Tipos de listado**: `ListQuery`/`FilterCondition`/`serializeListQuery` (`@reddoc/core` data-list).
- **Diálogos**: PrimeNG `DialogService` + `ENTITY_ACTION_DIALOG_DEFAULTS` (chrome estándar del ERP).
- **Cálculo**: `calcularResumen` / `calcularImpuestosLinea` (`@reddoc/core/calculo`).

### 4.1 Componentes/piezas nuevas

```
apps/erp/src/app/core/module-config/importar-documento/   (nombre tentativo)
├── importar-documento.types.ts        · LineaPendienteApi (sección 6.2) + config de importación
├── importar-documento.service.ts      · POST /general/documento-detalle/pendiente/ (paginado/filtrable)
└── components/
    └── importar-documento-modal/      · modal con <lib-data-table> (selección múltiple) + filtros
```

Reutilizamos (NO duplicar):

- `DocumentoDetalleService` (`libs/core/documento/`, vía `@reddoc/core`) — le agregamos: (a) **lectura por id**
  (`GET /general/documento-detalle/{id}/`) y (b) **alta masiva** (`POST .../masivo/`); hoy solo
  tiene crear/actualizar/eliminar.
- `comercialDetalleToFormValue()` (`features/documentos/comercial/`) — convierte la lectura de la
  línea en valor de formulario completo (item, precio, impuestos). Lo envolvemos para **anular el
  `id`** (línea nueva) y **fijar `documento_detalle_afectado`**.
- `comercialDetalleToPayload()` — al armar el payload de `masivo/` (edición) y el embebido (alta);
  hay que **extenderlo para incluir `documento_detalle_afectado`** (ver cambio de form abajo).

Flujo común (ambos modos):

- **Disparador (UI)**: botón "importar desde documento" en la barra de
  `comercial-documento-detalles` (junto a "agregar ítem"), visible según capability/config.
- **Modal**: lista las líneas pendientes (`pendiente/`) con `DataTableComponent` (selección
  múltiple + paginación). Filtra por el contacto del form (y tipo origen). Devuelve los `id` de las
  líneas elegidas vía `ref.close(seleccion)`.
- **Resolución de datos**: al confirmar, `forkJoin` de `GET documento-detalle/{id}/` por línea →
  `comercialDetalleToFormValue()` → fila resuelta (id null + `documento_detalle_afectado` seteado).
  El front **manda item/cantidad/precio/impuestos_ids explícitos** (decisión tomada; `pendiente/` no
  los trae).

> **Cambio de form necesario:** `ComercialDetalleGroup` debe ganar un control
> `documento_detalle_afectado: number | null` (oculto, default `null`) para arrastrar el vínculo en
> alta (embebido) y poder enviarlo en `masivo/` (edición). `comercialDetalleToPayload()` lo incluye.

### 4.2 ¿Acción extra (EntityActionStrategy) o no?

El patrón `EntityActionStrategy` + `ENTITY_ACTION_PROVIDERS` está pensado para acciones a nivel
**documento en la lista** (abren modal → HTTP → toast → `reload()`). Importar líneas es una
operación a nivel **detalle dentro del formulario**, que muta el `FormArray` y no recarga nada.

Propuesta: **NO** usar `EntityActionStrategy`. Modelarlo como una capacidad del componente de
detalles, configurable por el documento (similar a como la factura activa `mostrarBuscarDocumentos`
en el legacy). Reutilizamos sí el `DialogService` y el chrome `ENTITY_ACTION_DIALOG_DEFAULTS`.
(A confirmar en la fase de diseño detallado.)

### 4.3 Persistencia según modo (decidido)

La inserción de las líneas resueltas difiere según el modo del formulario — espeja el patrón que ya
usa `comercial-documento-detalles` (alta = virtual en el `FormArray`; edición = transacciona al
instante), pero en **lote**:

| Modo        | `documentId` | Qué hace al confirmar                                                                                          | Persistencia                                                                             |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Nuevo**   | `null`       | Empuja cada fila resuelta al `FormArray` (**virtual**).                                                        | Se guarda embebida cuando se crea el documento (el payload de alta ya manda `detalles`). |
| **Edición** | `<id>`       | `POST /general/documento-detalle/masivo/` con `{ documento: <id>, detalles: [...] }` (una sola request, no N). | Inmediata. Tras el POST, refresca la tabla (ver abajo).                                  |

Payload de `masivo/` (edición), por cada detalle —incluyendo el vínculo afectado—:

```jsonc
{
  "documento": 5,
  "detalles": [
    {
      "item": 1,
      "cantidad": 2,
      "precio": "1000.00",
      "impuestos_ids": [3],
      "documento_detalle_afectado": 15261,
    },
  ],
}
```

- **Refresco de la tabla en edición:** lo más simple y consistente con el form actual es **recargar
  el documento** (`gateway.getById` → reconstruir el `FormArray`), igual que hace `loadDocumento()`.
  Si `masivo/` devuelve las líneas creadas, se puede evitar la recarga empujándolas mapeadas. **A
  confirmar la respuesta de `masivo/`.**
- En **alta**, el `documento_detalle_afectado` viaja embebido en el `detalles` del payload de
  creación del documento (requiere que `comercialDetalleToPayload()` lo incluya — ver 4.1).

## 5. Configuración por documento

Cada documento que quiera importar declara su origen. Forma tentativa (a afinar):

```ts
// p. ej. en factura-venta.config.ts
importarDesdeDocumento: {
  // de qué tipo(s) de documento origen se pueden traer líneas
  documentoTipoOrigenId: 29,        // remisión, pedido, etc.
  // filtros base aplicados siempre (solo pendientes, aprobados, mismo contacto)
  soloPendientes: true,
  requiereContacto: true,           // filtra por el contacto seleccionado en la cabecera
  columnas: [...],                  // ColumnDef[] de la tabla del modal
  filtros: [...],                   // FilterField[] disponibles
}
```

## 6. Contrato del backend (confirmado por sonda)

### 6.1 Endpoint de origen — listar líneas pendientes

```
POST /api/general/documento-detalle/pendiente/
body:   { filtros: [], ordenamientos: [] }      // convención de listas del ERP
params: ?page=1&limit=10                         // paginación por query params
```

Respuesta: paginado Django REST estándar (compatible con el `PaginatedApiResponse` del gateway,
que solo lee `count` + `results`):

```jsonc
{
  "count": 899,
  "next": "https://.../pendiente/?limit=10&page=2",
  "previous": null,
  "results": [
    {
      "id": 15261, // id de la LÍNEA origen → futuro `afectado`
      "documento": 204, // id del documento (cabecera) origen
      "numero": null, // número del documento origen (puede venir null)
      "fecha": "2026-06-01",
      "contacto_id": 231,
      "contacto_nombre": "CONSORCIO RUTA 40",
      "item_nombre": "Servicio Vigilancia Movil IVA 16%",
      "cantidad": "1.000000", // decimal como string
      "total": "16456457.000000", // decimal como string (valor línea)
      "afectado": "0.000000", // valor ya facturado/afectado
      "pendiente": "16456457.000000", // valor pendiente = total - afectado
    },
    // …
  ],
}
```

### 6.2 Interfaz supuesta (a tipar)

```ts
/** Fila cruda de POST /general/documento-detalle/pendiente/ (decimales como string). */
interface LineaPendienteApi {
  readonly id: number; // id de la línea origen (documento_detalle) → documento_detalle_afectado
  readonly documento: number; // id del documento origen
  readonly numero: number | null; // número del documento origen
  readonly fecha: string; // ISO 'YYYY-MM-DD'
  readonly contacto_id: number;
  readonly contacto_nombre: string;
  readonly item_nombre: string; // ⚠️ NO trae item_id
  readonly cantidad: string;
  readonly total: string;
  readonly afectado: string;
  readonly pendiente: string;
}
```

### 6.3 Brechas que destapó la respuesta + decisiones

> **Actualización backend (final):** `pendiente/` ahora devuelve **todo** lo necesario: `item_id`,
> `precio`, `cantidad` **e `impuestos`** (shape `ItemImpuesto`: `impuesto_porcentaje` sin monto
> precalculado). **Se eliminó el `GET` por línea** (`consultar(id)`): la línea se construye
> directo desde la fila con `pendienteLineaToFormValue(row)`, calculando los montos de impuesto con
> el kernel (`calcularImpuestosLinea`). Cero requests extra al confirmar. `consultar` y
> `comercialDetalleImportToFormValue` se removieron (quedaron sin uso).

1. **Falta `item_id` / precio / impuestos → RESUELTO (opción B, sin tocar backend).**
   La respuesta de `pendiente/` solo trae `item_nombre`, `cantidad`, `total`. PERO la lectura de
   una línea (`GET /general/documento-detalle/{id}/`, shape `ComercialDetalleRead` que extiende
   `DocumentoDetalleReadBase`) **sí trae `item` (id), `item_nombre`, `precio`, `cantidad` e
   `impuestos`**, y ya existe el mapper `comercialDetalleToFormValue()` que la convierte en valor
   de formulario completo.

   **Decisión:** la lista `pendiente/` se usa solo para la **UI de selección**. Al confirmar, por
   cada línea elegida hacemos `GET /general/documento-detalle/{id}/` (con el `id` que sí tenemos),
   pasamos la lectura por `comercialDetalleToFormValue()` y construimos la fila nueva. Reusa el
   read-model y el mapper existentes; **no requiere cambio de backend**. (Análogo al legacy, que
   pegaba a `item/detalle/`, pero keyado por el id de la línea en vez del id del ítem — porque el
   legacy sí traía `item_id` en su lista y nosotros no.)

   Coste: N GET en `forkJoin` al confirmar. Para selecciones típicas (pocas líneas) es aceptable.
   Si más adelante molesta, se optimiza pidiendo a backend que `pendiente/` traiga item/precio/
   impuestos (opción A) sin cambiar el resto del diseño.

   Pendiente menor a confirmar: que `GET documento-detalle/{id}/` devuelva el mismo serializer que
   los `detalles` embebidos del documento (muy probable). `DocumentoDetalleService` necesita un
   método de lectura por id (hoy solo tiene crear/actualizar/eliminar).

2. **`pendiente` es por VALOR, no por cantidad → caso simple por ahora (decidido).**
   Importamos la **línea completa**: `cantidad` y `precio` salen directos de la lectura
   (`GET documento-detalle/{id}/`), que ya tiene el precio unitario — no necesitamos derivar
   `total/cantidad`. Asume `afectado = 0` (lo que muestran los datos). El **caso parcial**
   (`afectado > 0`: importar solo el valor pendiente repartido en cantidad×precio) queda **fuera de
   alcance de esta primera versión**; se define con negocio cuando aparezca.

3. **Nombres de campos para filtrar (server-side) — a confirmar con backend.**
   El form de factura ya tiene `contacto` seleccionado; el modal debe filtrar a ese contacto (y,
   probablemente, al tipo de documento origen). La respuesta usa campos planos (`contacto_id`), así
   que el filtro tentativo es `{ propiedad: 'contacto_id', operador: '=', valor: <id> }`. Confirmar
   nombres de propiedad filtrables.

4. **Persistencia del vínculo `afectado` — a confirmar con backend.**
   Al guardar la factura con líneas importadas, cada línea nueva debe mandar
   `documento_detalle_afectado = <id origen>` (el `id` de la fila de `pendiente/`). La fila
   importada se crea como **línea nueva** (`id = null`, para que haga POST y no PATCH) pero
   conservando la referencia al origen. Confirmar el nombre exacto del campo en el payload de
   `documento-detalle` y si el backend recalcula `afectado/pendiente` solo o requiere
   `regenerar-afectado`.

> Brechas #1 y #2 cerradas → el mapper ya no está bloqueado. Quedan #3 y #4 (nombres de campos),
> que no bloquean el diseño de UI/estructura y se resuelven en la fase de integración.

### 6.4 Endpoint de alta masiva (modo edición)

```
POST /general/documento-detalle/masivo/      // ⚠️ confirmar kebab vs snake (ver abajo)
body: { documento: <id>, detalles: [ { item, cantidad, precio, impuestos_ids, documento_detalle_afectado? } ] }
```

Puntos a confirmar con backend:

- **Naming del path.** El payload llegó como `/general/documento_detalle/masivo/` (snake_case),
  pero el resto del ERP usa kebab (`/general/documento-detalle/`). Confirmar cuál es el real para no
  romper por un guion.
- **¿Acepta `documento_detalle_afectado` por detalle?** (decisión "no estoy seguro" → diseñamos
  asumiendo que **sí**; si no, es bloqueante para que el pendiente se descuente). Aplica igual al
  create normal y al `detalles` embebido del alta de documento.
- **Respuesta de `masivo/`.** ¿Devuelve las líneas creadas (para refrescar la tabla sin recargar) o
  solo un OK? Define si recargamos el documento o empujamos la respuesta mapeada.
- **Recalculo de `afectado/pendiente`.** ¿El backend lo hace solo al crear con afectado, o requiere
  `POST /general/documento-detalle/regenerar-afectado/`?

## 7. Fases de implementación (alto nivel, sin código aún)

1. **Form: campo afectado** — agregar control `documento_detalle_afectado: number | null` a
   `ComercialDetalleGroup` e incluirlo en `comercialDetalleToPayload()`. ✅ **HECHO** — campo
   agregado en types/form/model/mapper (read + payload), default `null`. Typecheck ok.
2. **Servicio** — `LineaPendienteApi` (6.2) + lectura (`POST .../pendiente/`, paginado/filtrable) +
   lectura por id (`GET documento-detalle/{id}/`) + alta masiva (`POST .../masivo/`) en
   `DocumentoDetalleService`. Decimales string → number. ✅ **HECHO** —
   `DocumentoDetalleService` suma `consultar(id)` y `crearMasivo(documentoId, detalles)`; nuevo
   `ImportarDocumentoService.listarPendientes(query)` (reusa `buildListBody`/`buildListParams` de
   `@reddoc/core`). Tipos en `importar-documento.types.ts`. Exportados desde el barrel. Typecheck ok.
3. **Modal** — `DataTableComponent` selección múltiple + paginación + filtro por contacto del form;
   columnas: documento/número, fecha, contacto, ítem, cantidad, total, pendiente. Devuelve los `id`.
   ✅ **HECHO** — `importar-documento-modal` (`core/module-config/importar-documento/components/`):
   tabla con selección múltiple/paginación/orden, filtra por `contactoId` (de `DynamicDialogConfig.data`),
   carga vía `ImportarDocumentoService.listarPendientes`, devuelve las filas seleccionadas
   (`LineaPendienteApi[]`) por `ref.onClose` / `null` al cancelar. NO se exporta del barrel (lazy).
   i18n `documentImport.*` agregado (es+en) → **adelanta la Fase 6**. tsc ok + build ok (el template
   del modal se type-checkea al cablearlo en Fase 5).
4. **Mapper de importación** — envuelve `comercialDetalleToFormValue()`: anula `id`, fija
   `documento_detalle_afectado = <id origen>`. (Caso simple: cantidad/precio directos de la lectura.)
   ✅ **HECHO** — `comercialDetalleImportToFormValue(origen, afectadoId)` en
   `comercial-documento-detalle.mapper.ts`. tsc ok.
5. **Integración en `comercial-documento-detalles`** — botón + modal + `forkJoin` de lecturas, luego
   **bifurca por modo** (6.4 / 4.3): alta → push virtual al `FormArray`; edición → `masivo/` + refresco
   de la tabla. Recálculo por el kernel ya existente. ✅ **HECHO** — inputs `importEnabled` +
   `contactoId`, output `imported` (edición → el padre recarga), signal `importing`. `openImport()`
   abre el modal lazy (`DialogService` + `ENTITY_ACTION_DIALOG_DEFAULTS`); `resolveAndAdd()` hace el
   `forkJoin` de `consultar(id)` + `comercialDetalleImportToFormValue`; alta=`addImportedLocal`,
   edición=`persistImported` (`crearMasivo` + `imported.emit()`). Botón en toolbar (gated por
   `importEnabled`). tsc ok + build ok (template del modal validado como lazy chunk).
6. **Activación en factura de venta** — declarar la capability/config de importación. ✅ **HECHO** —
   `factura-venta-form` pasa `[importEnabled]="true"`, `[contactoId]="contacto?.id ?? null"` y
   `(imported)="onImported()"` (recarga el documento en edición vía `loadDocumento`). tsc + build +
   lint ok.
7. **i18n** — ✅ **HECHO en Fase 3** (namespace `documentImport.*`, es + en).
8. **Persistencia del vínculo afectado** — ✅ cubierto: el payload de línea
   (`comercialDetalleToPayload`) incluye `documento_detalle_afectado` en alta (embebido) y en
   `masivo/` (edición). Falta solo la **confirmación de backend** (abajo).
9. **Cierre con backend (PENDIENTE)** — confirmar puntos abiertos de 6.3 (#3 nombres de campos
   filtrables, #4 nombre del campo afectado) y 6.4 (naming `masivo/` kebab vs snake, soporte de
   `documento_detalle_afectado`, respuesta de `masivo/`, `regenerar-afectado`).

## 8. Fuera de alcance (por ahora)

- Flujo A (server-side merge).
- Importación de archivos Excel (eso ya lo cubre `ImportDialogComponent`, es otra cosa).
- Reglas de negocio de validación de cantidades (no exceder pendiente) — se decide en fase de diseño.
