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

## Patrón: barra de acciones pegajosa (`<lib-page-actions>`)

`libs/ui/src/lib/components/page-actions/` (vía `@reddoc/ui`) — la fila de botones de una página
(volver / guardar / editar). Se pega bajo el header al hacer scroll y **solo entonces** se viste de
chrome; en reposo es una fila de botones más. En un formulario largo, guardar no puede quedar
arriba fuera de vista. Se usa envolviendo los botones, sin nada más:

```html
<lib-page-actions>
  <p-button [label]="…" (onClick)="onCancel()" />
  <p-button type="submit" [label]="…" />
</lib-page-actions>
```

- **`top: 0` basta:** en los workspace-layout el documento **no** scrollea (`:host` con
  `overflow:hidden`), scrollea `.workspace-main`, y el `.app-header` es su hermano de arriba. Un
  sticky dentro del main se pega en el borde del scrollport, que es la línea del header — sin
  calcular sus 56px ni romperse si el header cambia de alto.
- **El scrollport no lleva `padding-top`.** Los navegadores no acuerdan desde dónde ancla un sticky
  cuando su scrollport tiene padding superior: Gecko lo suma al `top` (la barra ancla bajo el
  padding) y Blink/WebKit no. Por eso los `.workspace-main` aportan el gutter de arriba como
  **espaciador en el flujo** (`&::before` con `height: var(--page-gutter)`) y padding solo en los
  otros tres lados: visualmente idéntico, y todos los navegadores anclan en la línea del header —
  que es también lo que asume el umbral de detección del componente. Comprobado en Firefox
  headless: con padding-top la barra ancla 28px más abajo y `is-stuck` no dispara nunca.
- **La caja no cambia nunca.** El fondo lo pinta un `::before` desbordado, no padding del elemento.
  Si el padding apareciera al pegarse, la página saltaría 24px y el pegado podría entrar en bucle
  (crece → deja de estar pegada → encoge → vuelve a pegarse). Lo único que muta es una `opacity`.
- **`--page-gutter`:** el sangrado lateral sale de esa variable, que **cada layout declara sobre su
  scrollport** con el mismo valor que su padding (`.workspace-main`: `1.75rem`, `1.25rem` bajo
  768px). Así la banda llega a los bordes en vez de leerse como una tarjeta flotando, y el
  componente no repite ni el número ni el breakpoint de ningún layout. Un layout nuevo solo declara
  la suya; el default es `1.75rem`.
- **`--page-actions-air`** (`0.5rem`) alimenta a la vez el `top` del sticky, el desborde vertical
  de la banda y el umbral de detección: son el mismo valor. Se puede subir/bajar por página.
- **Detección — no usar `IntersectionObserver` con `threshold: [1]`.** Ese umbral exige que el ratio
  vuelva a valer **1 exacto** y con posiciones fraccionarias se queda en 0.999…: detecta el pegado y
  **nunca** el despegado. Va con comparación de rects (`barra.top <= scrollport.top + aire`) en el
  `scroll` del contenedor, pasivo. El scrollport se busca subiendo por el DOM hasta un
  `overflow-y: auto|scroll`, no por selector, para no acoplar el componente a un layout.
- **La clase se aplica a mano** (`classList.toggle`), no por binding: corre en cada evento de scroll
  y no vale despertar la detección de cambios para alternar una clase en el propio host.
- El contenido proyectado queda dentro del `<form>` en el DOM real: un botón `type="submit"` sigue
  enviando. Para algo alineado a la derecha, un `<div class="ml-auto">` dentro.

## Patrón: ficha de detalle en grupos (card única)

Para las páginas `*-detail` de un master con muchos campos de lectura. En vez de una card por
tema apilada verticalmente (que multiplica el chrome y obliga a hacer scroll), **una sola card**
con los campos repartidos en **grupos semánticos lado a lado**. Ejemplo vivo:
`general/masters/contacto/pages/contacto-detail` (identificación · contacto · ubicación).

- **Barra de título** (la de siempre): `flex flex-wrap items-center gap-x-3 gap-y-2 border-b
border-[rgba(20,48,73,0.08)] px-5 py-3.5` con chip de ícono
  (`h-9 w-9 rounded-[10px] bg-sky-50 text-sky-700`) + `<h2 class="text-[0.9rem] font-bold
tracking-tight text-brand-text">`. Los **badges de estado** de la entidad (pills de rol, activo/
  inactivo) van en esa misma fila con `ml-auto`: no cuestan alto propio y evitan tener que bajar a
  buscarlos.
- **Cuerpo en columnas:** `grid grid-cols-1 divide-y divide-[rgba(20,48,73,0.08)]
lg:grid-cols-[1.15fr_1fr_1fr] lg:divide-x lg:divide-y-0`. Lado a lado el alto de la card es el del
  **grupo más alto**, no la suma; apilado en móvil el mismo filete pasa a horizontal. La primera
  fracción va más ancha si ese grupo tiene los valores largos.
- **Micro-encabezado de grupo** (`__group`): uppercase `0.65rem/600`, `letter-spacing .06em`,
  `--brand-muted` con `opacity .7` — el mismo `group-label` del panel del app-switcher. Se distingue
  de la etiqueta de campo por caja y peso, **no por color**. Dentro, `<dl class="mt-3 flex flex-col
gap-3">` con pares `<dt>`/`<dd>` (`__label` `0.7rem/500` muted, `__value` `0.85rem/500` text).
- **Vacío = raya, nunca ocultar:** un campo sin dato se pinta con `—`. Si se oculta, el lector no
  puede distinguir "no tiene" de "no lo miré". Convención única para no repetir markup — el
  modificador va en el `<dd>` y el contenido cae al guion:
  `<dd class="__value" [class.__value--empty]="!x">{{ x || '—' }}</dd>`; con enlace
  (`mailto:`/`tel:`), el mismo modificador con `@if/@else`. `--empty` = `font-weight:400`,
  `color: var(--brand-muted)`, `opacity:.55` — presente pero sin competir al escanear la columna.
- **Colapsar lo que se lee junto** (es lo que de verdad achica la ficha, y no pierde ningún valor):
  - Identificador compuesto → **un** campo (`Documento` = tipo + número + DV), con el número en
    `font-mono tabular-nums`. Regla del sistema: el dato identificador siempre en monoespaciada.
  - Dirección → **bloque de sobre** en `<address class="not-italic">`, no cuatro campos sueltos:
    `dirección · barrio` / `ciudad — departamento · código postal`. Ahí el `—` aplica al bloque
    entero, no a cada parte. Armar las líneas en un `computed` del componente, no encadenando un
    `@if` por separador en el template.
- **Concatenar sin huecos:** unir partes (`número` + `-DV`) **en el componente**, nunca con dos
  interpolaciones vecinas en el HTML — al formatear, prettier las parte en líneas distintas y el
  colapso de espacios mete un blanco: `1118260345 -1`.
- **Cuándo NO usar `<lib-detail-header>`:** si esa cabecera solo repetiría campos que ya están en la
  ficha (nombre, identificador), es una card entera de alto por cero información. Se omite y la
  identidad la dan la miga + un `<h1 class="sr-only">` con el nombre — la página necesita su título
  accesible aunque no lo pinte. Si en cambio la entidad tiene un identificador que **no** es un
  campo más (número de documento transaccional, estado del flujo), el header sí gana su espacio.
- **Iniciales/monograma en una ficha: no.** El monograma es identidad donde el nombre **no** está
  (tenant-badge en el header, tiles del app-switcher). Al lado del nombre no aporta nada.
- **Ubicación de un campo = donde lo captura el form.** Si el formulario pide
  `correo_facturacion_electronica` dentro de «Información cliente», en el detalle va en la card de
  cliente, no entre los canales de contacto generales. Antes de agrupar, mirar el form.
- **Cards de rol aparte:** lo condicional a un flag (`cliente`, `proveedor`) se queda en su propia
  card bajo la ficha — son datos comerciales, no básicos, y su ausencia es significativa.

## Regla: un elemento que no pinta nada sigue ocupando su ranura

El bug de layout más repetido del ERP, y no se ve en el HTML: **`gap` se cobra por posición,
no por contenido**. En un `display:flex` (o grid) con `gap`, cada hijo ocupa su ranura y separa a
sus dos vecinos aunque mida `0×0`. Angular vacía el _contenido_ de un componente cuyo `@if` no
entra, pero **no borra el host**: el elemento a medida sigue en el DOM y sigue siendo flex item.

Dos formas de la misma falla, ambas ya corregidas en la raíz:

- **Componente condicionalmente vacío** — `<lib-field-error>` sin error, entre el input y lo que
  venga después: cobra `gap` a ambos lados (el doble de aire), y cuando es el último hijo infla el
  alto del campo. Está en los ~250 usos del componente.
- **Overlay declarado en el flujo** — `<p-confirmDialog />`, `<p-dialog>`, un `app-*-modal`:
  cerrados no pintan nada, pero entre el encabezado y la primera card de una página empujan
  `n × gap` hacia abajo. En una página de detalle (`:host` flex con `gap: 1.25rem`), dos overlays
  = `2.5rem` de aire sin explicación.

**La cura, según el caso:**

- **A veces tiene contenido, a veces no** → el host se saca del flujo cuando está vacío, con un
  host binding: `host: { '[style.display]': "mensaje() ? null : 'none'" }`. Con contenido vuelve a
  su display por defecto, así lo que ya se veía queda idéntico. Vive en `lib-field-error` y en
  `app-vencimiento-hint`.
- **Nunca ocupa lugar (overlays)** → `display: contents`, que hace que el elemento no genere caja
  propia. Los de PrimeNG los cubre `libs/styles/src/primeng/_overlays.scss` (importado por el
  `styles.scss` de las 6 SPAs); esa regla alcanza al `<p-dialog>`, **no** al wrapper, así que un
  componente propio que envuelva un overlay declara además `:host { display: contents }`. Es seguro
  porque la máscara del diálogo es `position: fixed` y no participa del flujo en ningún caso.
- **Lo que se puede evitar de entrada** → si el `@if` vive en el template _padre_, no queda
  elemento y no hay ranura que pagar. Es la opción preferible cuando el componente se puede omitir.

**Al escribir un componente nuevo, la pregunta es:** ¿puede este componente no renderizar nada? Si
la respuesta es sí, su host tiene que saber desaparecer. Vale igual para `space-y-*`, que aplica
márgenes con `> * + *` y también cuenta al elemento vacío.

## Patrón: aviso de desvío en un campo derivado (vencimiento)

`features/documentos/comercial/components/vencimiento-hint/` — cuando el valor de un campo lo
**deriva** el sistema de otros dos (aquí `fecha_vence = fecha + días del plazo de pago`) pero la
persona puede sobrescribirlo, el campo avisa cuando el valor dejó de ser el derivado.

- **Solo habla cuando hay algo que decir.** Mientras la fecha coincide con la que dicta el plazo,
  el componente no renderiza nada (y su host desaparece, ver la regla de la ranura). Se probó
  también una nota permanente que explicaba el origen del valor en reposo; se descartó por ruido:
  una línea fija bajo un campo que casi siempre está en su estado normal cuesta atención todos los
  días para explicar algo que casi nunca sorprende.
- **Desviado:** una línea `text-amber-700` + `pi pi-exclamation-circle` con de cuánto es la
  diferencia (y contra qué plazo), y un botón que **nombra la fecha** a la que vuelve
  (`Usar 15/09/2026`) — no un genérico «restablecer».
- **Ámbar, no rojo, y sin invalidar el form:** apartarse de la condición pactada es una excepción
  legítima del negocio (la factura del proveedor llega con su fecha impresa y manda). El rojo se
  reserva para lo imposible — aquí, vencer antes de emitir, que sí es un validator duro.
- **Se calla ante un error del campo** (`[silenciar]`): el mensaje rojo manda y dos líneas
  competirían.
- **El estado lo expone la lógica, no el componente:** `setupVencimientoAutocompute` devuelve
  `{ diasPlazo, sugerido, desvio, restablecer }` y el hint es tonto. Así los 6 formularios
  comerciales lo heredan sin repetir nada.
- **Contrapartida a tener presente:** sin señal en reposo, que el autocálculo funcione sigue siendo
  invisible — que fue justo lo que se reportó como «no carga el plazo de pago». Si el reporte
  vuelve, el lugar donde mostrarlo es el campo del plazo, no el del vencimiento.

## Patrón: invitación en el inicio de un módulo (tira con atmósfera)

`core/components/inicio-invitacion/` (`<app-inicio-invitacion>`) — "hay algo disponible para tu
empresa" en el landing de un módulo. Lo comparten el inicio de Venta (activar facturación
electrónica) y el de General (asistente de datos iniciales, y su acuse). **Una sola familia
visual**: si cada módulo inventara la suya, el ERP tendría varias formas de decir lo mismo.

- **Tira horizontal, no card de empty-state centrada.** Quien entra a un módulo viene a trabajar,
  no a hacer onboarding: chip + copy a la izquierda, acciones a la derecha, todo en una barrida,
  y el resto del inicio queda libre para lo que venga después (indicadores, accesos rápidos).
- **Shell:** `relative overflow-hidden rounded-xl border-[rgba(20,48,73,0.1)] bg-brand-surface`
  `animate-fade-up`; fila `flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4` (con `relative`
  para montar sobre las capas). Chip `h-9 w-9 rounded-[10px] bg-sky-50 text-sky-700` + ícono
  `text-[1rem]`. Copy `min-w-[15rem] flex-1`: `h2` `0.9rem/bold tracking-tight text-brand-text`,
  `p` `0.8rem/leading-relaxed text-brand-muted mt-0.5`.
- **Nada de banda de alerta** (ni ámbar, ni borde grueso, ni fondo tintado): no hay nada roto, hay
  algo disponible. Sigue siendo una ficha del ERP.
- **Atmósfera en vez de ilustración** — tres capas decorativas, todas `aria-hidden`
  `pointer-events-none absolute`, que reemplazan a los SVG del legacy **sin sumar assets**:
  1. **Grilla de puntos** — `w-[58%]` a la derecha,
     `bg-[radial-gradient(circle,rgba(20,48,73,0.16)_1px,transparent_1.6px)] bg-[size:14px_14px]`
     - `[mask-image:linear-gradient(to_left,rgba(0,0,0,0.85),transparent)]`. Celdas de una tabla
       esperando datos: la imagen del ERP. El máscara es lo que evita que compita con el copy.
  2. **Halo sky** — `-top-16 -right-10 h-56 w-72 rounded-full`
     `bg-[radial-gradient(closest-side,rgba(119,170,215,0.22),transparent)]`. El acento de marca
     como luz, no como bloque de color.
  3. **Marca de agua** — el mismo `pi-*` del dominio a `text-[7.5rem]`, `rgba(20,48,73,0.05)`,
     `-rotate-[10deg]`, sangrando por `-right-3 -bottom-7`. Cada inicio trae su glifo.
     Los tres diales son opacidad; si alguna vez pesan, bajar la grilla (`0.16` → `0.10`) primero.
- **Un solo acento.** El acuse de éxito **no** vira a verde: el ERP declara jerarquía por
  estructura, no por color, y sumar una segunda familia cromática para una tira que se ve una vez
  diluye. El significado lo cargan el glifo (`pi-check-circle`) y el copy en pasado.
- **API:** `icon` / `title` / `desc` como inputs y las acciones proyectadas (`<ng-content>`,
  envueltas en `flex shrink-0 items-center gap-2`). El componente no sabe nada del dominio de
  quien lo usa: uno mete un botón y el otro dos.
- **Dos acciones, una oferta:** cuando hay salida secundaria (omitir/descartar), va
  `[text]="true" severity="secondary"` a la izquierda del primario. Lo que ofrecemos sigue siendo
  uno solo. Cada botón lleva su `[loading]` y deshabilita al otro: se ve **cuál** está en vuelo,
  en vez de apagarse la tira entera.
- **Cuándo aparece:** solo con el parámetro **confirmado** por el backend (`signal<boolean | null>`,
  `null` = en vuelo o falló). Nunca arrancar en el valor que muestra la tira: parpadearía en toda
  entrada al módulo, incluso en contenedores que resolvieron eso hace meses. Si la sonda falla, no
  se ofrece nada.

## Patrón: acuse de una acción masiva (modal recibo)

Cuando un clic crea cientos de registros de una, la acción **no se resuelve en silencio** — pero
tampoco en la página: va a un **modal**. Ejemplo vivo:
`features/general/inicio/components/plantilla-cargada-dialog/`, tras `plantilla/cargar/`.

- **Por qué modal y no una tira en línea.** Se probó primero en línea y quedaba como nota al pie de
  una pantalla por lo demás vacía: la persona acababa de hacer el cambio más grande de la vida del
  contenedor y el acuse no pesaba más que un aviso. El modal obliga a mirarlo una vez y después
  desaparece para siempre. **Regla:** acuse en línea para lo que se repite (guardar, filtrar);
  modal para lo irrepetible y voluminoso.
- **Puede permitirse más presencia de lo habitual** justamente porque pasa una sola vez: no hay
  fatiga posible. No extender esta licencia a pantallas de trabajo.
- **La forma es un recibo contable, no un dashboard.** Nombre a la izquierda, **guía punteada** que
  estira (`min-w-4 flex-1 translate-y-[-0.15rem] border-b border-dotted
border-[rgba(20,48,73,0.25)]`), cantidad a la derecha en `font-mono text-[0.85rem] font-semibold
tabular-nums`. La **suma al pie**, tras `border-t-2 border-[rgba(20,48,73,0.12)]`, en
  `--brand-navy` y un punto más grande. Es el idioma en el que ya lee quien usa un ERP —el ojo baja
  buscando el total— y no vocabulario prestado de un panel de métricas.
- **La marca entra como luz, nunca como campo de color.** La cabecera lleva las mismas tres capas
  de la tira de invitación y a la misma opacidad de susurro, sobre blanco: grilla
  `rgba(20,48,73,0.14)` @ `14px` con máscara **vertical**
  (`linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 88%)`), halo sky
  `rgba(119,170,215,0.28)` centrado arriba, y el **mismo chip sky** de la tira escalado
  (`h-12 w-12 rounded-[14px] bg-sky-50 text-sky-700 ring-1 ring-[rgba(20,48,73,0.06)]`) — es la
  firma de "algo disponible para tu empresa" en los inicios, y el acuse cierra ese arco.
  **Se probó con la banda en navy sólido y se descartó:** pesaba de más y un bloque de color es
  justo lo que el sistema evita ("jerarquía por estructura, no por color"). Para un acuse no hace
  falta gritar; alcanza con que la superficie tenga textura.
- **La atmósfera se disuelve, no se corta.** La máscara vertical hace que el recibo emerja del
  degradado sin que ningún borde separe cabecera de cuerpo. Un `border-b` ahí habría partido el
  modal en dos piezas cosidas en vez de una sola superficie.
- **Una sola animación, y que signifique algo:** las líneas entran escalonadas
  (`animation-delay: 80 + i*45 ms`, `0.34s cubic-bezier(0.16,1,0.3,1)`) — el recibo se escribe solo.
  Menos de medio segundo en total. Con `@media (prefers-reduced-motion: reduce)` en `none`.
- **Frame:** `.erp-plantilla-dialog` en `styles.scss` (el dialog se teletransporta al body, así que
  el frame no puede ser scoped) — radius `16px`, la sombra en capas del `.erp-action-dialog`,
  `.p-dialog-header { display: none }` y `.p-dialog-content { padding: 0 }` para que la banda navy
  sangre hasta el borde. El markup propio **sí** lo alcanzan los estilos del componente: la
  encapsulación emulada viaja en el atributo del elemento. Ojo con los **backticks en comentarios
  CSS** dentro de `styles: [\`…\`]`— cortan el template literal y el compilador tira un`Failed to resolve styles at position 0 to a string` que no señala la línea.
- `[closable]="false"` + `[dismissableMask]="false"`: hay una sola salida y es el botón. No es una
  consulta que se abandona, es un acuse que se lee.
- **Orden descendente por cantidad:** lo que más entró es lo que cuenta la historia.
- **Nombres por mapa abierto:** el backend devuelve etiquetas Django (`contabilidad.ConCuenta`), así
  que el dict las traduce en un `Readonly<Record<string, string>>` y la pantalla **cae a la clave
  cruda** si falta. Un modelo nuevo en la plantilla no rompe el build ni desaparece del recuento:
  feo es mejor que mentir sobre el total.
- **El parámetro recalculado sale de la propia respuesta** (`gen_asistente_datos_iniciales`), no de
  releer el endpoint de parámetros.

## Patrón: informe paginado con totales de cuadre (tabla propia)

`features/contabilidad/informes/balance-prueba/components/balance-prueba-table/` — cuando un
informe **pagina** pero necesita una **fila de totales** que cubra el resultado entero.
`<lib-data-table>` no la cubre, así que la tabla es propia; lo que **no** puede ser propio es el
lenguaje visual, o el informe se lee como una isla dentro del ERP.

Lo que hay que copiar de `<lib-data-table>`, y por qué:

- **Encadenar el flex hasta el scrollport.** `:host { display:flex; flex-direction:column; flex:1;
min-height:0; overflow:hidden }` y el wrapper con `flex:1; min-height:0; overflow:auto`.
  **`flex: 1` en el host no es opcional:** `.list-shell__table` es un flex column con `flex:1` que
  ocupa el alto de la card, y un hijo sin `flex` mide su contenido — la tabla queda pegada arriba y
  el borde del recuadro dibuja un rectángulo vacío debajo. Con datos se disimula; **con el informe
  vacío es lo único que se ve**. Fue un bug real (2026-09-04), heredado de `saldos-cuenta-table`,
  donde no se notaba porque no había paginador debajo.
- **Empty state que llena la caja**, no una línea en un `<td>`: `pi pi-inbox` (`1.4rem`, muted,
  `opacity .5`) + título (`0.95rem/700 --brand-navy`) + pista (`0.8rem` muted, `max-width:280px`),
  centrado con `padding: 4rem 1rem`. Para que llene el alto: `height:100%` en la tabla **solo
  cuando está vacía** y `height:1px` en el `<th>` — en una tabla `height` es un mínimo, así que el
  sobrante cae entero en la fila del empty state y el header no se infla.
- **Dos vacíos distintos, dos copys distintos.** "Todavía no generaste" y "sin resultados" se leen
  al revés: el primero pide una acción, el segundo dice que la acción ya se hizo y no había nada.
  Un `generated: boolean` los separa. Y el copy va como `{ title, sub }` — la forma canónica de
  todos los empty states del dict.
- **Header sticky** `#f8f9fa` + `box-shadow: inset 0 -1px 0 rgba(19 38 60 / 0.1)` (no
  `border-bottom`: con `border-collapse` el borde se despega al scrollear). Celdas `.6rem/.75rem`
  (`th`) y `.55rem/.75rem` (`td`), `tabular-nums`, hover `rgba(19 38 60 / 0.02)`.
- **Pie:** `border-top: 1px solid rgba(19 38 60 / 0.08)`, paginador **centrado** y contador
  (`1–25 de 63 registros`) en `position:absolute; right` — mismo reparto que `lib-data-table`. El
  contador va **fuera** del `<p-paginator>` (no por sus templates internos) para no acoplarse a la
  estructura interna de PrimeNG; al paginador se le quita su caja (`padding:0; border:0;
background:transparent`) porque el marco lo pone el pie.
- **Totales sticky al fondo** (`position:sticky; bottom:0`) y **solo con filas**: un cuadre en `$ 0`
  sobre un informe vacío no dice nada y compite con el empty state. Se resalta en rojo cuando
  débito ≠ crédito — comparar dos cifras a ojo es justo lo que el informe evita.
- **Los totales no se calculan sobre las filas.** Con el informe paginado, sumar lo recibido da el
  total de la página. Vienen de su propia acción del backend (`totales/`).
- **Cargando ≠ vaciar.** Al cambiar de página se atenúa lo que ya está (`opacity:.55;
pointer-events:none`), no se parpadea la tabla entera. **No se atenúa el empty state**: no hay
  nada que refrescar y el spinner del botón ya lo dice.
- **Guard del paginador:** PrimeNG reemite `onPageChange` al reprogramarle `first`/`rows`; sin
  `if (page === page() && pageSize === pageSize()) return;` cada respuesta dispara otra consulta.
- **Sass:** las declaraciones sueltas van **antes** de cualquier regla anidada (`&--x`,
  `&::-webkit-scrollbar`) o el build tira `mixed-decls`.

## Patrón: aviso de resultado desactualizado (informe ya generado)

Para una pantalla de **consultar → resultado** donde los parámetros pueden cambiar después de
generar (informes contables). El problema: cambiás la fecha y la tabla sigue mostrando los números
del rango anterior como si fueran vigentes — y la descarga de Excel **sí** sale con los parámetros
nuevos, así que pantalla y archivo dejan de coincidir sin que nadie avise.

- **No se limpia la tabla.** Quitarle a alguien los números que está leyendo por haber tocado un
  campo es peor que el problema. Se avisa y listo.
- **Aviso a la izquierda de la botonera**, empujado con `mr-auto` dentro del `justify-end`:
  `pi pi-exclamation-circle` + texto en `text-[0.78rem] text-amber-700`.
- **Ámbar, no rojo** — mismo criterio que el aviso de vencimiento: apartarse no es un error, es un
  estado legítimo con una salida obvia (volver a generar). El rojo se reserva para lo imposible.
- **El texto nombra la salida**, no el síntoma: «Cambiaste los parámetros — generá de nuevo».
- **Mecánica:** un `signal` que enciende `form.valueChanges` (solo si ya se generó) y que la
  consulta apaga. El aviso viaja como `input` opcional (`hint`) de la botonera compartida, con
  `@if` — vacío no pinta nada y no cuesta ranura de `gap`.

## i18n

Claves bajo `layout.*` en `app.dict.ts` (tipo) + `app.es.ts` + `app.en.ts`. Resolución por
notación de punto vía `I18nService<AppDict>.t()`. Siempre las tres a la vez.
