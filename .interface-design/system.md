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

`shared/app-switcher/` — waffle en `app-header__actions` (izquierda del user-menu, en
workspace-layout y shell-layout) para saltar a apps hermanas del monorepo (turnos, luego más).
Enchufado en ambos layouts. **No usa PrimeNG**: panel custom con signals (mejor UX de hover y
control total del look; `p-popover`/`p-megaMenu` no encajan con tiles de monograma ni con hover).

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
  blanco (`pi` de dominio; turnos → `pi pi-clock`). Es el mismo idioma del `tenant-badge`: la
  constelación de apps se lee como una familia, no como un dropdown genérico. Nombre debajo
  `0.8rem/500 --brand-text`.
- **Placeholder de crecimiento:** tile "Próximamente" con `background:transparent`, borde
  `1px dashed rgba(19 38 60 / 0.2)`, `pi pi-plus` muted, `aria-hidden`. Rellena la grilla con 1 sola
  app y anticipa lo que viene.
- **Registro progresivo** (`app-switcher.constants.ts`): `SwitcherApp[]` tipado
  (`id`, `icon`, `url:(env)=>env.<app>Url`, `name/description:(d:AppDict)=>…`). Agregar app =
  1 entrada + bloque i18n `layout.appSwitcher.apps.<id>` + URL en los 3 environments del ERP +
  campo en `ReddocEnvironment` (`libs/core/tokens.ts`). El componente **filtra por URL presente**
  (`flatMap` → `[]` si `undefined`): una app sin URL en ese entorno no se muestra → rollout sin
  tocar el componente. Navegar a otra app = leer su `env.<app>Url` (mismo patrón que "Gestionar
  cuenta" con `cuentaUrl` en user-menu).
- **A futuro:** cuando se necesite en turnos/pos/etc., promover a `@reddoc/ui` con un token de
  registro. Reemplazar el monograma por SVG real cuando exista en `libs/ui/src/assets/logos/`.

## i18n

Claves bajo `layout.*` en `app.dict.ts` (tipo) + `app.es.ts` + `app.en.ts`. Resolución por
notación de punto vía `I18nService<AppDict>.t()`. Siempre las tres a la vez.
