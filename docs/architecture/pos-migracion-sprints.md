# Migración del POS: plan por sprints

> Plan de ejecución de `docs/architecture/pos-migracion.md`. Cada sprint deja
> algo navegable y verificable; el siguiente se apoya en el anterior. Las
> decisiones de producto están cerradas en la sección 8 del análisis y aquí no se
> rediscuten.

## Reglas del plan

- **Un sprint = una rama** que se puede probar sola contra `reddocapi.uk`.
- Lo cross-app va a `libs/` **antes** de usarlo en `apps/pos`; el ERP pasa a
  importarlo de ahí en el mismo sprint (no se deja duplicado "para después").
- Nada de PrimeNG en el bundle inicial del POS: todo lo pesado va lazy.
- Las convenciones del `CLAUDE.md` aplican tal cual: signals, standalone, sin
  `any`, errores tipados, textos sin mayúsculas intermedias, `FORMATO_FECHA`,
  celdas vacías sin guiones.

## Vista general

| Sprint | Entrega                                                     | Depende de |
| ------ | ----------------------------------------------------------- | ---------- |
| 0      | App navegable con tenant + cimientos compartidos en `libs/` | —          |
| 1      | Configuración de la caja + catálogo con búsqueda            | 0          |
| 2      | Carritos en pestañas con cliente, líneas y resumen          | 1          |
| 3      | Cobro en efectivo: crear → pagar → aprobar → imprimir       | 2          |
| 4      | Historial + alta rápida de cliente e ítem                   | 3          |
| 5      | Cierre: permisos, atajos, tablet, observabilidad, deploy    | 4          |

---

## Sprint 0 · Esqueleto y cimientos

**Objetivo.** Entrar al POS, elegir contenedor y aterrizar en un workspace vacío
bajo `/t/:slug/caja`, con todo lo que la caja va a necesitar ya disponible desde
`@reddoc/core`.

### 0.1 `apps/pos` con tenant (patrón `apps/turnos`)

- `app.config.ts`: `CURRENT_APP: 'pos'`, `tenantInterceptor`, `TENANT_ROUTES`,
  `ENTITY_DATA_GATEWAY → HttpEntityDataGateway`, `LOCALE_ID es-CO`,
  `withComponentInputBinding`, `provideI18n` con diccionario propio (`@pos/i18n`).
- `app.routes.ts`: `''` con `rootRedirectGuard`; `/auth`; `/contenedores` bajo
  shell layout con `ContenedoresListComponent` y `clearTenantGuard`;
  `/t/:tenantSlug` con `tenantSlugMatchGuard` + `tenantAccessGuard` y el
  workspace layout.
- Layouts: `shell-layout` y `workspace-layout` (header compacto: tenant badge,
  user menu, app-switcher; sidebar mínimo con Caja / Historial / Configuración).
- `ReddocAppId` suma `'pos'`; `ENVIRONMENT.posUrl` en erp y turnos para que el
  app-switcher lo liste; `proxy.conf.json`, `environment.staging/prod`, Sentry
  como las demás SPA.
- `tsconfig` con alias `@pos/*` (mismo criterio que `@erp/*`).

### 0.2 Subir del ERP a `libs/core` (sin componentes PrimeNG)

| Qué                                                                                                                                                                                                                                                         | A dónde                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Item`, `ItemImpuesto`, `ItemPayload`, `ItemService`                                                                                                                                                                                                        | `libs/core/src/lib/item/`                |
| `PrecioDetalleService` (al menos `consultarPrecioItem`) y sus tipos                                                                                                                                                                                         | `libs/core/src/lib/precio/`              |
| `ComercialDetalleRead/Payload`, `ComercialDetalleFormRawValue`, mapper completo (`tasasDelItem`, `toLineaCalculo`, `lineBruto…lineNeto`, `recomputeImpuestosLinea`, `precioUnitarioCon/SinImpuestos`, `comercialDetalleToPayload`), `precioListaDeContacto` | `libs/core/src/lib/documento/comercial/` |
| `PosDocumentoRead/Payload`, `posDocumentoToFormValue`, `formValueToPayload`                                                                                                                                                                                 | `libs/core/src/lib/documento/pos/`       |
| `PagoRead/Payload`, `DocumentoPagoService`, `calcularPagos`, `DOCUMENTO_PAGO_ENDPOINT`                                                                                                                                                                      | `libs/core/src/lib/documento/pagos/`     |

- El ERP cambia sus imports a `@reddoc/core`; se borran los archivos movidos.
- Los specs existentes (`comercial-documento-detalle.mapper.spec`, `pago.calculo.spec`,
  `pago.mapper.spec`) viajan con el código.
- `ErpItemAutocompleteComponent` se queda en el ERP: el POS no lo usa.

### 0.3 Verificaciones contra el backend (sin código de producto)

- Confirmar que `POST documento/` con `detalles[].impuestos_ids` y tipo 27
  responde 201 con `id` (ya lo usa el ERP; es solo comprobar con un tenant POS).
- Resolver "Consumidor final": `contacto/seleccionar/?cliente=true&search=2222`
  y anotar si el id es estable por tenant.
- Confirmar que `documento/imprimir/` del tipo 24/27 devuelve el formato ticket.

**Terminado cuando:** `npx nx build pos`, `npx nx lint pos`, `npx nx build erp`
y `npx nx lint erp` pasan; se entra al POS, se elige contenedor y se ve el
workspace vacío; el app-switcher del ERP muestra el POS.

**Estado (2026-10-14, rama `pos/sprint-0`).** 0.1 y 0.2 hechos: build, lint y
tests de erp, turnos, pos, core y ui en verde; el bundle inicial del ERP y de
turnos no cambió. Ajustes respecto del plan:

- `pendienteLineaToFormValue` se quedó en el ERP
  (`features/documentos/comercial/pendiente-linea.mapper.ts`) porque depende del
  tipo de importación de documentos, que es solo del ERP.
- `calcularPagos` recibe `PagoCalculable` (`pago` + `estado_anulado`) en vez del
  tipo del formulario de pagos del ERP.
- `formValueToPayload` del POS pasó a `posDocumentoToPayload` y recibe
  `PosDocumentoValores`; el tipo del formulario POS del ERP quedó sin uso y se
  borró.
- En el POS la pantalla de contenedores solo permite entrar, salir y cambiar la
  vista: crear, editar, invitar, eliminar y suscripción se hacen desde el ERP.
- `posUrl` solo está en los environments de desarrollo de erp y turnos; staging
  y producción se suman con el deploy (sprint 5) para no enlazar una app sin
  publicar.

Pendiente: 0.3 necesita una sesión real en un tenant con POS.

---

## Sprint 1 · Configuración de la caja y catálogo

**Objetivo.** Ver los ítems vendibles del tenant en tarjetas y buscarlos; tener
la caja configurada.

### 1.1 `ConfiguracionCajaStore`

- Signals + localStorage con clave `pos:config:<tenantSlug>`.
- Campos: `documentoTipoId` (24 | 27), `sede`, `almacen`, `cuentaEfectivo`,
  `asesor` (opcional). Todos como `ErpSelectOption` para no re-consultar nombres.
- `completa()` computed: tipo + cuenta de efectivo son obligatorios; sede y
  almacén recomendados (el almacén se sugiere el primero, como el ERP).
- Página `/t/:slug/configuracion` con `lib-api-select` sobre `sede/seleccionar/`,
  `almacen/seleccionar/`, `cuenta-banco/seleccionar/`, `asesor/seleccionar/` y un
  radio para el tipo de documento (etiquetas desde i18n).
- La caja muestra el aviso "configuración requerida" con link cuando
  `completa()` es falso (equivalente al banner ámbar del legacy).

### 1.2 Catálogo

- `CatalogoService` sobre `ItemService.list` con filtros `venta = true`,
  `inactivo = false`, orden `-favorito`, página de tamaño generoso; `search` por
  `nombre contiene`; `codigo =` para barras.
- `CatalogoStore` con los ítems en memoria, `refrescar()` y `toggleFavorito(id)`
  (`PATCH item/{id}/` + reorden local).
- `lib-item-card` (POS): miniatura (`imagen_principal_url_miniatura` o
  placeholder), código, nombre, precio con `formatCop`, badge de cantidad en el
  carrito (input), estrella de favorito, "N disponibles"/"Agotado" solo si
  `inventario`. Tailwind; PrimeNG únicamente para el botón de favorito.
- Buscador con dos modos (nombre / código de barras) y foco automático;
  `Enter` en modo código dispara la búsqueda exacta y, si hay un único resultado,
  emite "agregar directo". Grid responsive 2→5 columnas.

**Terminado cuando:** con la caja configurada se ven las tarjetas, la búsqueda
por nombre filtra, el lector de códigos (o teclear un código + Enter) selecciona
el ítem, y el favorito persiste tras recargar.

**Estado (2026-10-14).** Hecho y en verde (build, lint, tests). Ajustes:

- Obligatorios para vender: tipo de documento, **almacén** y cuenta de
  efectivo. El almacén pasó a obligatorio porque es lo que mueve el inventario
  de cada línea. Sede y asesor quedan opcionales.
- El lector de barras busca por código exacto y deja el texto seleccionado para
  la siguiente lectura; **agregar directo al carrito** entra con el carrito en
  el sprint 2.
- `item/lista/` recibe `venta = true` e `inactivo = false`, pero no está
  confirmado que el backend los tenga en su lista blanca: el catálogo además
  descarta en el cliente lo que no sea vendible. Si no están declarados, la
  paginación puede traer páginas con menos tarjetas de las pedidas.
- Marcar favorito no reordena en el momento (la tarjeta saltaría bajo el
  cursor); el orden nuevo entra en la siguiente búsqueda.
- `ItemService` sumó `actualizarFavorito` (PATCH solo de `favorito`) y el modelo
  `Item` sumó `existencia` y `disponible`; `SELECT_ENDPOINTS` sumó `sede`.

---

## Sprint 2 · Carritos

**Objetivo.** Armar ventas completas (sin cobrar) en varias pestañas que
sobreviven a recargas.

### 2.1 `CarritosStore`

- Modelo `Carrito { uuid, nombre, creadoEn, contacto: ErpSelectOption | null, lineas: LineaCarrito[] }`
  y `LineaCarrito` = `ComercialDetalleFormRawValue` sin `id` (ya está en `@reddoc/core`).
- Signals: `carritos`, `activoId`; computed `activo`, `resumenActivo`
  (`calcularResumen(lineas.map(toLineaCalculo))`), `cantidadTotal`.
- Persistencia localStorage `pos:carritos:<tenantSlug>` con versión de esquema
  (igual que `schemaVersion` de los filtros) para invalidar sin romper.
- Acciones: `nuevo()`, `renombrar()`, `eliminar()` (la primera pestaña no se
  elimina), `agregarItem(item, precioPactado)`, `cambiarCantidad()`,
  `editarLinea(precio, cantidad)`, `retirarLinea()`, `vaciar()`, `setContacto()`.
- Al agregar: `ItemService.getById` → `tasasDelItem(item, 'venta')` (todos los de
  venta, no solo IVA) → `calcularImpuestosLinea`; si el contacto tiene
  `precio_id` (`precioListaDeContacto`) → `consultarPrecioItem` pisa el precio.
- **Bloqueo de stock en front:** si `item.inventario && !item.negativo`, la
  cantidad no supera `disponible`; se avisa con toast y la tarjeta queda marcada.

### 2.2 UI del carrito

- Pestañas arriba del catálogo (PrimeNG Tabs o botones Tailwind): nombre, menú
  con renombrar/eliminar, botón "+".
- Panel derecho: `lib-contacto-select` filtrado `cliente=True` con
  "Consumidor final" por defecto (resuelto una vez por tenant y cacheado en el
  store de configuración); lista de líneas con contador +/-, editar
  precio/cantidad en un `p-drawer` o popover, retirar; resumen (productos,
  cantidad, subtotal, impuestos agrupados, total); botones "Cobrar" (deshabilitado
  sin líneas o sin configuración) y "Vaciar" con confirmación.
- Badge de cantidad en las tarjetas del catálogo alimentado por el store.

**Terminado cuando:** se puede abrir tres ventas, cambiar de cliente en una,
recargar la página y encontrar todo igual; un ítem con stock 0 no se agrega.

---

## Sprint 3 · Cobro

**Objetivo.** Cerrar una venta real: documento creado, pagado, aprobado e
impreso.

### 3.1 Modal de cobro

- Lista de **medios de pago** declarativa (`MEDIOS_PAGO_POS`): `efectivo`
  habilitado; tarjeta, transferencia y combinado presentes como deshabilitados
  con etiqueta "próximamente". Cada medio declara cómo se traduce a uno o más
  `PagoPayload` (cuenta bancaria + monto); sumar un medio después es agregar una
  entrada y su formulario, no tocar el pipeline.
- Formulario efectivo: valor recibido (prellenado con el total, con máscara
  de moneda), cambio y pendiente calculados con `calcularPagos`; cuenta de
  efectivo y asesor vienen de la configuración de la caja (editables en el
  modal). No se permite confirmar con recibido menor al total (en efectivo la
  venta se paga completa); `metodo_pago` y `plazo_pago` salen de los catálogos
  (`SELECT_ENDPOINTS`) con un default configurable, no de ids quemados.

### 3.2 Pipeline (`CobroService`)

1. `formValueToPayload` del POS (`@reddoc/core`) con `documento_tipo` de la
   configuración, `fecha` y `fecha_vence` = hoy (`toIsoDate(startOfToday())`),
   `sede`, `almacen`, `asesor`, `detalles` con `comercialDetalleToPayload`.
2. `gateway.create` → `extractDocumentoId`.
3. `DocumentoPagoService.crear` por cada pago (`pago` = total en efectivo).
4. `gateway.aprobar`.
5. Estados del botón: guardando → pagando → aprobando. Errores tipados
   (`CobroError` con fase); si falla después de crear, toast con el motivo del
   backend y link al historial: el documento existe sin aprobar y se resuelve
   desde el ERP.
6. Éxito: pantalla "venta exitosa" con **Imprimir** (`gateway.imprimir`, con
   `FACTURA_POS_CONFIG`-like mínimo: `{ endpoint, id }`) y **Nueva venta**; se
   elimina el carrito cobrado y se refresca el catálogo (stock).

**Terminado cuando:** una venta aparece aprobada en el ERP con sus líneas, su
pago y su PDF; un fallo simulado en aprobar deja el documento visible y el
carrito intacto.

---

## Sprint 4 · Historial y altas rápidas

**Objetivo.** Operación diaria completa sin salir al ERP para lo cotidiano.

### 4.1 Historial

- `/t/:slug/historial` con `lib-data-table` sobre `documento/lista/` filtrando
  `documento_tipo_id in [24, 27]`, orden `-fecha, -numero, -id`, paginado.
- Columnas de `buildPosColumns` (ya existen; se mueven a `libs/` o se declaran
  en el POS: id, número, fecha, identificación, contacto, subtotal, impuesto,
  total, aprobado, anulado, contabilizado). Filtros: fecha, número, contacto,
  aprobado (`FilterStorageService`).
- Acción por fila: imprimir. Sin ficha propia en esta fase: el detalle completo
  está en el ERP.

### 4.2 Cliente rápido

- Modal desde el selector de cliente: tipo de identificación
  (`lib-identificacion-select`), número con dígito de verificación (util del
  ERP, subir a `libs/core`), nombre corto, correo, celular (`lib-phone-input`),
  ciudad (`lib-ciudad-autocomplete`). `cliente: true`, `tipo_persona` y
  `regimen` con defaults del tenant.
- `POST contacto/` + validación de identificación duplicada (`contacto/validar/`).
  Al guardar queda seleccionado en el carrito activo.

### 4.3 Ítem rápido

- Modal desde el buscador: código, nombre, precio, producto/servicio,
  inventario, impuestos de venta (`impuesto/seleccionar/?venta=True`), favorito.
  `venta: true`.
- `POST item/` con `ItemService.create`; se refresca el catálogo y, si se abrió
  desde una búsqueda por código sin resultados, se agrega al carrito.

**Terminado cuando:** se crea un cliente y un ítem desde la caja y ambos se
usan en una venta; el historial muestra la venta e imprime.

---

## Sprint 5 · Cierre

**Objetivo.** Dejar el POS listo para producción.

- **Acceso:** exigir el flag del plan (`acceso_venta`, salvo que el contenedor
  traiga `acceso_pos`) en el `tenantAccessGuard` del POS, y permisos por modelo
  (`GenDocumento`, `GenItem`, `GenContacto`) para ocultar cobrar/crear, siguiendo
  `docs/guides/permisos-erp.md`.
- **Teclado y lector:** foco permanente en el buscador, Enter agrega, atajos
  para cobrar y nueva venta; el lector de barras funciona sin tocar el mouse.
- **Tablet:** el layout de dos columnas colapsa a catálogo + carrito en drawer.
- **Observabilidad y budgets:** Sentry en `environment.prod.ts`, budget del
  bundle inicial, `npx nx affected -t lint build`.
- **Documentación:** guía `docs/guides/pos.md` (configurar una caja, flujo de
  cobro, qué hacer con una venta no aprobada) y actualización de `CLAUDE.md`
  (`apps/pos` deja de ser esqueleto; nuevos módulos de `libs/core`).
- **Deploy:** workflow de build/deploy del POS igual que las demás SPA; variables
  de entorno de staging y producción.

**Terminado cuando:** release del POS en staging probada por una persona con un
lector de códigos y una impresora, y el `CHANGELOG` lo refleja.

---

## Fuera de alcance (registrado para después)

- Cuadre de caja (requiere backend: apertura, base, arqueo, cierre).
- Medios de pago distintos de efectivo y pago combinado (la estructura queda lista).
- Ficha de documento dentro del POS; edición de ítems y clientes más allá del alta rápida.
- PWA/offline.
- Impresión directa a térmica (ESC/POS) sin pasar por el PDF.
