# Interface Design System — reddoc ERP

Sistema de diseño del ERP (apps/erp). Las decisiones aquí son la fuente de verdad:
respétalas al agregar UI; si algo se desvía, es un bug de consistencia.

## Dirección y feel

- **Intent:** herramienta administrativa multi-tenant para operadores. Densa pero calmada;
  estructura por jerarquía sutil, no por color. "Sé invisible": el sistema se siente, no se ve.
- **Convención de capitalización (CLAUDE.md):** sentence case en español. Solo la primera palabra
  con mayúscula — "Nueva empresa", no "Nueva Empresa".
- **Tailwind primero** para utilidades; tokens de marca compartidos en `libs/styles`.

## Depth

- **Borders-only.** Sin sombras en estructura (header, sidebar, nav). La definición viene de
  bordes de baja opacidad, no de elevación.

## Tokens y paleta

Variables de marca (de `libs/styles`, usadas con `var(--...)`):

- `--brand-navy` (`#143049`) — primario / identidad. Fondo de monogramas, texto activo.
- `--brand-blue` — acento (íconos activos).
- `--brand-text` — texto primario.
- `--brand-muted` / `--brand-muted-2` — texto secundario / íconos inactivos.
- `--brand-bg` — canvas.

**Bordes y separadores** — siempre rgba navy de baja opacidad, nunca hex sólido:

- `rgba(19 38 60 / 0.08)` — borde estándar (header bottom, sidebar right).
- `rgba(19 38 60 / 0.12)` — divisor con un poco más de presencia (ej. divisor del header).
- `rgba(19 38 60 / 0.04)` — hover de items de nav.
- `rgba(19 38 60 / 0.08)` — fondo de item activo.

## Spacing / radius

- Base efectiva en rem; gaps comunes `0.5rem` (brand), `0.7rem`–`0.75rem` (items de nav).
- Radius: `6px` elementos pequeños (monograma, hamburguesa, leaf), `8px` items/headers de nav.

## Layout: header del workspace (56px)

`workspace-layout.component` — `.app-header` sticky, `height: 56px`, fondo
`rgba(255 255 255 / 0.85)` + `backdrop-filter: blur(12px)`, borde inferior `rgba(19 38 60 / 0.08)`.
Estructura `space-between`:

```
[brand: hamburguesa(móvil) · logo · divisor · tenant-badge]   [module-bar centrado]   [user-menu]
```

- **Divisor del header** (`.app-header__divider`): `width:1px; height:20px;`
  `background: rgba(19 38 60 / 0.12)`. Se oculta vía `&__brand:not(:has(.tenant-badge)) &__divider`
  para no quedar colgando cuando no hay badge.

## Patrón: tenant-badge (identidad de contenedor)

`layouts/tenant-badge/` — ancla de "¿en qué empresa estoy?" arriba-izquierda. Etiqueta estática
(no switcher; cambiar empresa vive en el user-menu).

- **Composición:** monograma (inicial, `--brand-navy` con texto blanco, `24×24`, radius `6px`,
  `font-size 0.72rem / 600`) + nombre (`--brand-text`, `0.85rem / 600`).
- **Nombres largos:** monograma fijo + nombre con `max-width: 190px` (desktop) / `120px` (móvil),
  `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`. Nombre completo en `title` + `aria-label`.
  `min-width:0` en el contenedor flex para permitir encoger sin desbordar la barra de módulos.
- **Dato:** `TenantService.currentContenedor()?.nombre`, repoblado por `tenantAccessGuard` antes de
  pintar (sobrevive reload duro). Fallback al `currentSlug()`.
- **Regla general:** para identidad/monogramas usar la inicial + color de marca; aunque el texto
  trunque, el monograma mantiene la identidad.

## Patrón: nav del sidebar

`workspace-layout` — sidebar `240px`, `background:#fff`, borde derecho `rgba(19 38 60 / 0.08)`,
oculto `<768px` (se reemplaza por `<p-drawer>`). Items: `0.85rem`, radius `8px`, hover
`rgba(19 38 60 / 0.04)`, activo `rgba(19 38 60 / 0.08)` + texto `--brand-navy` + ícono `--brand-blue`.
Acordeones con chevron `pi` alineado a la derecha (`margin-left:auto`).

## Patrón: tabla horizontal de datos slim (tira calendario)

Para mostrar un set fijo de pares `etiqueta → dato` corto y comparable (ej. código de turno por
día del mes / día de semana en `secuencia-detail`). Tira tipo calendario en vez de cards o `<dl>`:
lee de un vistazo el patrón completo y ocupa poco alto.

- **Estructura:** `<div class="overflow-x-auto px-5 py-4">` → `<table>`. Una fila `<thead>` con la
  etiqueta y una fila `<tbody>` con el dato debajo (alineados por columna).
- **Columnas iguales (clave):** usar `table-fixed` para que el ancho NO dependa del largo del
  texto (si no, etiquetas como "domingo festivo" ensanchan su columna y desalinean el resto).
  - Pocas columnas (≤ ~12): `w-full table-fixed` → reparten todo el ancho.
  - Muchas columnas (ej. 31 días): `w-full min-w-[60rem] table-fixed` → llenan el ancho en
    pantallas grandes y hacen scroll bajo el `min-width`.
- **Encabezado** (`<th>`): etiqueta en `text-[0.7rem] font-semibold text-brand-muted`,
  `text-center`, `tabular-nums` si es numérica, `leading-tight` si puede envolver en 2 líneas.
  Único divisor: `border-b border-[rgba(20,48,73,0.1)]` (sin grilla vertical).
- **Cuerpo** (`<td>` `text-center align-middle`, `pt-2.5`):
  - **Dato presente → ficha:** `<span class="inline-block rounded-md bg-[rgba(20,48,73,0.06)]
px-2 py-0.5 font-mono text-[0.8rem] font-semibold text-brand-text">`. El tinte navy = "tiene
    valor"; las fichas dan el ritmo visual sin necesidad de bordes de columna.
  - **Dato vacío → punto tenue:** `<span class="text-[0.9rem] text-[rgba(20,48,73,0.25)]">·</span>`.
- **Regla:** el dato siempre en monoespaciada; etiqueta en muted. Borders-only (solo el divisor
  bajo el encabezado). Mostrar el set completo (incluidos los vacíos como punto) para que el patrón
  se lea como una tira. Usar solo para valores cortos; si son largos, volver al `<dl>` vertical.

## Patrón: disclosure de datos secundarios (banda colapsable)

Para campos poco relevantes de un formulario (metadatos, referencias externas, numeración, notas)
que no deben competir con la cabecera principal ni ocupar espacio de entrada. Banda delgada al
**pie de la card** que colapsa/expande; colapsada cuesta **una sola línea**. Lo primario queda
siempre visible (a diferencia de tabs, que esconderían también lo primario tras un clic).

Ejemplo vivo: "Datos adicionales" (orden de compra, prefijo/número, comentario) en el form de
`factura-compra-recurrente`.

- **Estado:** un `signal<boolean>` en el componente (`adicionalesOpen`, default `false`) + método
  `toggle...()` con `.update((o) => !o)`. Nada de PrimeNG: un `@if` gobierna el bloque expandido.
- **Banda** (`<button type="button">`, full-bleed dentro del card con `overflow-hidden`):
  `flex w-full items-center gap-2 border-t border-[rgba(20,48,73,0.08)] px-5 py-3 text-left`
  `transition-colors hover:bg-[rgba(20,48,73,0.04)]`. Es la **misma** `px-5` del card pero más
  slim (`py-3` vs `py-5` del cuerpo). Reusa el idioma del acordeón del sidebar.
- **Chevron:** `pi pi-chevron-right text-[0.7rem] text-brand-muted transition-transform`
  `[class.rotate-90]="open()"` — leading, rota 90° al abrir. Sin color de acento: revelar no es una
  acción, va todo en muted.
- **Etiqueta:** `text-[0.85rem] font-medium text-brand-muted`. **Hint** ("opcional") a la derecha
  con `ml-auto text-[0.72rem] text-brand-muted`.
- **Región expandida** (`@if (open())`): `div` con `id` (referenciado por `aria-controls`),
  `border-t border-[rgba(20,48,73,0.08)] px-5 py-5 max-[576px]:px-4 max-[576px]:py-4` y dentro la
  **misma grilla** que la cabecera (`grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2`) para que el
  ritmo no cambie al abrir.
- **A11y:** `<button>` real con `[attr.aria-expanded]="open()"` + `aria-controls="<id>"`.
- **Cuándo NO:** si los campos son primarios o hay muchísimos, usar tabs o una card aparte. El
  disclosure es para "guarnición" que la mayoría de las veces no se toca.

## Patrón: app-switcher (constelación de apps reddoc)

`libs/ui/src/lib/app-switcher/` (`<lib-app-switcher>`, vía `@reddoc/ui`) — waffle en
`app-header__actions` (izquierda del user-menu, en workspace-layout y shell-layout) para saltar
entre apps hermanas del monorepo. Hoy lo consumen **erp y turnos**, en sus dos layouts cada uno.
**No usa PrimeNG**: panel custom con signals (mejor UX de hover y control total del look;
`p-popover`/`p-megaMenu` no encajan con tiles de monograma ni con hover).

El componente es **agnóstico de app**. Lo único que cambia por app son sus providers:

- `CURRENT_APP` (`@reddoc/core`, tipo `ReddocAppId`) — quién soy, para **excluirme de mi propia
  lista**. Cada `app.config.ts` lo provee: `{ provide: CURRENT_APP, useValue: 'erp' satisfies ReddocAppId }`.
- Las `<app>Url` del `ENVIRONMENT` — a quiénes veo. El ERP declara `turnosUrl`; turnos declara
  `erpUrl`. Ninguno declara la suya, así la auto-exclusión queda respaldada también por config.

- **Trigger:** `pi pi-th-large`, `32×32`, mismo tratamiento que la hamburguesa
  (hover/activo `rgba(19 38 60 / 0.06)`, radius `6px`, ícono muted→text).
- **Interacción:** `open = signal(false)`. Hover para abrir con **gracia de 150ms** al salir
  (`CLOSE_DELAY_MS`, no perder el panel al cruzar el gap) + **click** (touch/teclado) + `Escape`
  - click-fuera (`@HostListener('document:click')`, narrow con `target instanceof Node`). A11y:
    trigger con `aria-haspopup`, `[attr.aria-expanded]`, `aria-controls`; panel `role="menu"`, items
    `role="menuitem"`.
- **Panel:** `position:absolute; top:calc(100% + 8px); right:0; z-index:60` (sobre el header z-50),
  `width:260px`, `#fff`, borde `rgba(19 38 60 / 0.08)`, radius `10px`. Overlay flotante → excepción
  al borders-only: whisper-shadow `0 10px 30px rgba(19 38 60 / 0.1)` + animación de entrada `0.12s`
  (`translateY(-4px)→0`, `opacity`). Encabezado como `group-label` (uppercase `0.65rem/600` muted
  `opacity .7`).
- **Grilla waffle:** `grid-template-columns: repeat(2, 1fr); gap:0.25rem`. Cada app = `<a>` columna
  centrada, hover `rgba(19 38 60 / 0.04)`, radius `8px`, `target="_blank" rel="noopener"`.
- **Tile = identidad reddoc:** monograma `44×44` navy (`var(--brand-navy)`) radius `10px` + glifo
  blanco (`pi` de dominio; erp → `pi pi-building`, turnos → `pi pi-clock`). Es el mismo idioma del
  `tenant-badge`: la constelación de apps se lee como una familia, no como un dropdown genérico.
  Nombre debajo `0.8rem/500 --brand-text`.
- **Placeholder de crecimiento:** tile "Próximamente" con `background:transparent`, borde
  `1px dashed rgba(19 38 60 / 0.2)`, `pi pi-plus` muted, `aria-hidden`. Rellena la grilla con 1 sola
  app y anticipa lo que viene.
- **Sin apps hermanas → sin trigger:** el template entero va tras `@if (apps().length)`. Una app sin
  URLs configuradas no muestra un waffle que abre un panel vacío.
- **Catálogo progresivo** (`app-switcher.constants.ts`): `SwitcherApp[]` tipado (`id: ReddocAppId`,
  `icon`, `url:(env)=>env.<app>Url`). Los textos NO viven acá: los da el dict. El componente
  **filtra por URL presente** (`flatMap` → `[]` si `undefined`) y por `CURRENT_APP` → rollout sin
  tocar el componente. Navegar a otra app = leer su `env.<app>Url` con `target="_blank"` (mismo
  patrón que "Gestionar cuenta" con `cuentaUrl` en user-menu).
- **Agregar una app** = id en `ReddocAppId` (`libs/core/tokens.ts`) + `<app>Url` en
  `ReddocEnvironment` + 1 entrada en `SWITCHER_APPS` + su bloque en `app-switcher.es/en.ts` (el
  `Record<ReddocAppId, …>` del dict **obliga** a traducirla) + la URL en los environments de las
  apps que deban verla. Nada más.
- **i18n del lib** (`libs/ui/src/lib/app-switcher/i18n/`): dict propio + `AppSwitcherTranslationsHost`,
  calcado de `libs/ui/src/lib/auth/i18n/`. Cada app hace
  `AppDict extends AuthTranslationsHost, AppSwitcherTranslationsHost` y pone `appSwitcher: appSwitcherEs/En`.
- **Pendiente:** deep-link al tenant activo (`${url}/t/${slug}`) — hoy enlaza a la raíz, así que al
  saltar hay que reelegir empresa. Y reemplazar el monograma por SVG real cuando exista en
  `libs/ui/src/assets/logos/`.

## Patrón: banda de vigencia + tabla de días acotada por rango

Para tablas de "un input por día del mes" (calendario editable) donde solo un **subrango** de
días es válido (una línea de documento acota `fecha_desde..fecha_hasta`): los días fuera del rango
se **bloquean** (no editables, no viajan en el payload) y una banda arriba de la tabla anuncia el
rango vigente. Ejemplo vivo: modal `programacion-agregar-contrato-modal` (apps/turnos) — la tabla de
días del mes de la programación de un contrato.

- **Lógica compartida, NO en el componente:** el núcleo puro vive en `programacion.utils.ts` y lo
  reusan todos los modales de día — `estaEnVigencia(iso, vigencia)` (predicado, comparación ISO
  lexicográfica), `clavesEnVigencia(claves, vigencia)` (Set de claves ISO, para grillas keyed por
  fecha como `editar-puesto`) y `formatVigenciaRango(vigencia, locale)` (etiqueta del chip). El tipo
  `ProgramacionVigencia` es de dominio (`programacion.model.ts`). **No** re-implementar la comparación
  ni el formato dentro de cada componente — eso fue el error inicial (lógica atrapada + acoplada al
  modelo día-como-número, no reutilizable por la grilla transpuesta keyed por ISO).
- **Fuente del rango:** un `ProgramacionVigencia | null` (ISO `YYYY-MM-DD`), armado con
  `vigenciaDe(desde, hasta)` (regla "rango solo con ambos extremos"). `null` = sin rango →
  **degradado seguro**: todos los días habilitados y sin banda. Dos orígenes vistos:
  - **Rango único del modal** (agregar-contrato): viene de un GET **por-línea**
    (`DocumentoDetalleService.obtenerPorId`) que hace el store → un signal `vigencia`.
  - **Rango por-banda** (editar-contrato / editar-puesto, input-driven): cada banda es una línea
    (`documento_detalle_id`) con su **propia** vigencia, así que un solo `[vigencia]` del padre NO
    sirve. Fuente primaria: `fecha_desde?`/`fecha_hasta?` **opcionales** en `ProgramacionFila`
    (cero HTTP si el backend los manda). Fallback real: `ProgramacionVigenciasStore`
    (`programacion-vigencias.store.ts`, provisto por modal) — `cargar(ids)` hace GET por línea
    deduplicado y expone `Map<documento_detalle_id, vigencia|null>`; el componente los combina en un
    computed `vigenciasPorLinea` (fila `??` store). Como el GET llega **después** de construir el
    form, el effect de build lee la vigencia con `untracked` y un **segundo effect** aplica
    `disable()/enable()` sobre los controles existentes (sin reconstruir → no pisa lo tecleado),
    bumpeando las versiones que relean `enabled`. El chip de rango va **por banda** (group-row).
- **Cálculo de habilitados:** `computed<ReadonlySet<...>>` filtrando con `estaEnVigencia` /
  `clavesEnVigencia` según la grilla sea por número de día o por clave ISO. Sin vigencia → todos.
- **Bloqueo real (no solo visual):** en el `effect` que reconstruye el `FormArray` de días, cada
  control nace `.disable({ emitEvent: false })` si su día no está habilitado. El effect depende de
  `dias()` **y** `vigencia()`, así reacciona cuando el rango llega async (se reconstruye ya
  bloqueado). Un control deshabilitado = input no editable y sin aporte al payload. Guardá también
  los _auto-rellenos_ (ej. picker de secuencia): `if (control?.enabled) control.setValue(...)`, y
  **excluí las celdas deshabilitadas de las validaciones cliente-side** (ej. la regla "un turno por
  día entre puestos" en editar-contrato: `if (control.enabled && control.value.trim())`) — si no, un
  día bloqueado con valor pre-cargado marca un conflicto que traba el guardado y no se puede corregir
  (input deshabilitado).
- **Banda de vigencia** (arriba de la tabla, `@if (vigenciaEtiqueta())`): misma franja slim del
  idioma de banda —
  `flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[9px] border border-[rgba(20,48,73,0.12)] bg-[rgba(20,48,73,0.02)] px-3.5 py-2`.
  Ícono navy en contenedor (`h-[1.35rem] w-[1.35rem] rounded-[6px] bg-[rgba(20,48,73,0.06)] text-brand-primary`,
  `pi pi-calendar`) + micro-label uppercase muted + **ficha navy** con el rango
  (`inline-block rounded-md bg-[rgba(20,48,73,0.06)] px-2 py-0.5 font-mono text-[0.8rem] font-semibold tabular-nums text-brand-text`)
  - hint muted a la derecha (`ml-auto text-[0.72rem] text-brand-muted`) que **justifica** los días
    bloqueados. El rango se formatea con `Intl.DateTimeFormat` según `i18n.lang()` (`es-CO`/`en-US`),
    **sin año** y con día+mes corto en ambos extremos: `15 de jul - 31 de jul` (es) / `Jul 15 - Jul
31` (en) — el año ya se ve en el header/período.
  - **Variante chip** (grid y group-rows de los modales de edición): el mismo rango pero como pill
    `group-chip` **navy por defecto** + `pi pi-calendar`, junto al chip de horario. Regla de color:
    el horario (hora del día) es teal; la vigencia (ventana de fechas) va navy — reutiliza
    `formatVigenciaRango`, así el rango se lee idéntico en banda y en chip. En el grid degrada a
    oculto si el detalle no trae `fecha_hasta` (hoy el backend solo manda `fecha_desde`).
- **Feedback de día bloqueado — el rayado ES la marca** (una sola señal en todas las tablas de día):
  `repeating-linear-gradient(-45deg, #f1f3f5, #f1f3f5 3px, #e9ecef 3px, #e9ecef 6px)`.
  - Bloqueo **por columna** — cuando TODAS las bandas comparten la vigencia (agregar-contrato:
    una sola línea; editar-puesto: varias bandas pero una misma línea): rayado en el `th`
    (+ número/inicial a `rgba(20,48,73,0.3)`) **y** en el `td`.
  - Bloqueo **por banda** — cuando cada banda tiene su propio rango (editar-contrato: un contrato
    en varios puestos/líneas): rayado por `td`, y el header —compartido— raya solo la
    **intersección**: un computed `Set` de claves bloqueadas en TODAS las bandas
    (`filas.every(...)`); con una sola banda equivale a su vigencia. Si la tabla tiene hover de
    fila que pinta `td`, duplicar el selector (`.x__td--bloqueado, .x__row:hover
.x__td--bloqueado`) para que el hover (más específico) no apague las franjas.
  - La regla del header: rayarlo **solo si el bloqueo de esa columna es verdad para todas las
    filas** — nunca marcar el header con el rango de una sola banda.
  - El input `:disabled` **se funde con el rayado**: `background: transparent; border-color:
transparent; color: rgba(20,48,73,0.35); cursor: not-allowed` — sin caja propia, solo el valor
    atenuado sobre las franjas.
  - La regla `--bloqueado` va **después** de finde/festivo (les gana el fondo) y **antes** de
    error/conflicto (esos estados, más importantes, la ganan a ella). Misma especificidad → orden.
- **Regla:** el bloqueo debe ser real (control deshabilitado), no solo un estilo — si el input sigue
  editable o el día sigue viajando en el payload, no está bloqueado. La banda existe para **explicar**
  por qué hay columnas apagadas; sin ella el bloqueo se lee como bug.

## Patrón: matriz de toggles con contador de fila (`n/total`)

Para matrices `entidad × acción` donde cada celda es un toggle independiente y el caso común es
"dale todas las acciones de esta fila". Ejemplo vivo: picker de permisos de
`usuario-permisos-panel` (modelo × ver/agregar/cambiar/eliminar).

- **Celda:** caja **idéntica en ambos estados** — `inline-flex h-5 w-5 rounded-full border`, ícono
  `pi pi-check` siempre presente; solo cambia la tinta (asignado: `border-brand-navy bg-brand-navy
text-white`; libre: borde `rgba(20,48,73,0.2)`, texto transparente, el check se **insinúa** al
  hover). Así el toggle no salta de tamaño ni de posición.
- **Contador de fila = estado + switch:** en la celda de la entidad, alineado a la derecha, una
  **ficha mono** `n/total` (`rounded-md border px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold
tabular-nums`). El número dice qué hay, el clic dice qué hacer. Tres estados, **misma geometría**:
  - `0/n` → borde `rgba(20,48,73,0.12)` + texto muted (hover sube borde a `0.35` y texto a `text`).
  - parcial → `border-transparent bg-[rgba(20,48,73,0.06)] text-brand-text` (ficha navy tenue).
  - `n/n` → `border-brand-navy bg-brand-navy text-white` (sólido = lleno, mismo tinte que las celdas).
  - Es el idioma "ficha navy = tiene valor" de la tira calendario, aplicado a un agregado.
- **Denominador real:** `total` = las celdas que **trajo la consulta**, no un número fijo. Si la
  fila no tiene una acción, dice `0/3` y no promete algo que no existe. Con `total <= 1` el contador
  **no se pinta**: ahí el atajo no ahorra nada.
- **Alcance del barrido:** solo las columnas estándar de la matriz. Lo custom (chips `extras`) queda
  afuera — es puntual y no es "todo lo normal sobre esta entidad".
- **Truncado:** celda como `flex items-center gap-2`, etiqueta `min-w-0 flex-1 truncate`, contador
  `shrink-0`. Sin `min-w-0` el nombre largo desborda y empuja la ficha fuera de la columna.
- **Lote sobre backend de a uno:** las peticiones salen en paralelo con `forkJoin`, pero **cada una
  con su `catchError`** (`map(() => ({celda, ok:true}))` / `of({celda, ok:false})`) — nunca un
  `forkJoin` que aborta al primer error: si 3 entran y 1 falla, se revierte **solo la que falló** y
  la matriz queda mostrando lo que de verdad se guardó. Al dar, solo se piden las que faltan.
- **Un solo toast por lote** (`{n}` + `{entidad}`), no uno por celda. El toggle individual conserva
  su toast propio.
- **Bloqueo mientras vuela:** los ids del lote entran al set `pendientes`; el contador y sus celdas
  van `disabled:cursor-wait disabled:opacity-40`.
- **Descubrimiento:** un número no grita "soy un botón". El `title`/`aria-label` dice la acción
  ("Dar las 4 acciones de Contacto" / "Quitar las…") y el **subtítulo del modal** la anuncia
  ("Toca una casilla, o el contador de la fila para dar todo el modelo"). `[attr.aria-pressed]` con
  el estado lleno.
- **Cuándo NO:** si el barrido es destructivo o costoso (bulk por columna = decenas de escrituras de
  un clic), no va como toggle directo — eso pide confirmación explícita.

## i18n

Claves bajo `layout.*` en `app.dict.ts` (tipo) + `app.es.ts` + `app.en.ts`. Resolución por
notación de punto vía `I18nService<AppDict>.t()`. Siempre las tres a la vez.
