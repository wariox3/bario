# Migración del POS: mapa del legacy y comparación con el monorepo

> Análisis previo a implementar `apps/pos`. Describe cómo funciona el POS legacy
> (`pos-reddoc-legacy`, Angular 18 + Metronic + NgRx), qué ya existe en el
> monorepo (libs + ERP) y en el backend (OpenAPI de `reddocapi.uk` del
> 2026-10-14), y qué falta. No propone copiar código del legacy: propone qué
> comportamiento preservar y sobre qué piezas nuestras construirlo.

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Mapa del legacy](#2-mapa-del-legacy)
3. [Lo que ya tenemos](#3-lo-que-ya-tenemos)
4. [Comparación funcionalidad por funcionalidad](#4-comparación-funcionalidad-por-funcionalidad)
5. [Endpoints: legacy vs backend actual](#5-endpoints-legacy-vs-backend-actual)
6. [Huecos del backend](#6-huecos-del-backend)
7. [Propuesta de arquitectura para `apps/pos`](#7-propuesta-de-arquitectura-para-appspos)
8. [Decisiones abiertas](#8-decisiones-abiertas)

---

## 1. Resumen ejecutivo

El POS legacy es **una sola pantalla de venta** más tres satélites: historial,
configuración (tipo de documento + sede) y un CRUD de ítems. Su valor está en el
**flujo de caja**: catálogo en tarjetas, búsqueda por nombre o código de barras,
varios carritos abiertos en pestañas que sobreviven a recargas, cliente por
defecto "Consumidor final", cobro en efectivo con cambio, y al cobrar crea el
documento, lo aprueba y ofrece imprimirlo. Cuadre de caja es un placeholder
vacío.

En el monorepo **ya existe casi toda la capa de datos** que ese flujo necesita,
porque el ERP implementó la familia POS (factura POS 27 y factura POS
electrónica 24) con cabecera, líneas y pagos sobre el endpoint genérico de
documentos, y `libs/core` tiene el kernel de cálculo fiscal probado, el gateway
de documentos (crear, aprobar, imprimir, emitir), el tenant/contenedores y la
autenticación. `apps/pos` hoy es un esqueleto con login y un dashboard vacío.

Lo que falta es, sobre todo, **la experiencia de caja** (catálogo, carritos,
cobro rápido) y **tres cosas del backend**: dónde guardar la configuración del
POS por tenant (el campo `pos_documento_tipo` del legacy no existe), la
validación de existencias antes de vender (`inventario/existencia/validar/` no
existe) y cualquier noción de cuadre de caja. Además hay que decidir qué piezas
del ERP se **suben a `libs/`** para no duplicarlas (modelos y mappers de línea
comercial, pagos, servicio de ítems y de lista de precios).

---

## 2. Mapa del legacy

### 2.1 Stack y arquitectura

| Aspecto      | Legacy                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Angular 18 standalone, Metronic (Tailwind 3 + KTComponents), ng-select, SweetAlert2, ngx-mask, jsPDF                                                                          |
| Estado       | NgRx store (`usuario`, `contenedor`, `configuracion`, `facturacion`) con `ngrx-store-localstorage` sincronizando `facturacion`, `contenedor` y `configuracion` a localStorage |
| Auth         | JWT Bearer en cookie (`tokenInterceptor`), usuario serializado en cookie `usuario` con expiración de 3 h                                                                      |
| Multi-tenant | **Por subdominio**: la URL base es `http://subdominio.reddocapi.online` y `reemplazarUrlInterceptor` sustituye el literal `subdominio` por el del contenedor activo           |
| Offline      | `provideServiceWorker` (PWA registrada dos veces, enabled fuera de dev)                                                                                                       |
| Errores HTTP | `httpErrorInterceptor` con estrategias por status (`bad-request.strategy`)                                                                                                    |

Todo esto en el nuevo lo resuelven `libs/core` (cookies HTTP-only, `tenantInterceptor` con cabecera `X-Tenant`, `errorInterceptor`, Sentry) y no se porta.

### 2.2 Rutas

| Ruta legacy                          | Componente                   | Qué hace                                                 |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------- |
| `/auth/login`                        | `LoginComponent`             | Login                                                    |
| `/contenedor/lista`                  | `ContenedorListaComponent`   | Elegir contenedor (con layout propio)                    |
| `/dashboard/facturacion`             | `FacturacionBaseComponent`   | **La caja** (catálogo + carrito + cobro)                 |
| `/dashboard/facturacion/:contenedor` | ídem                         | Entrada directa a un contenedor por cookie               |
| `/dashboard/configuracion`           | `ConfiguracionBaseComponent` | Tipo de documento POS y sede                             |
| `/dashboard/historial`               | `HistorialListaComponent`    | Facturas emitidas, con imprimir                          |
| `/dashboard/cuadre_caja`             | `CuadreCajaComponent`        | **Vacío** (template sin contenido)                       |
| `/administracion/item/lista`         | `ItemListaComponent`         | CRUD de ítems (lista, nuevo, editar, detalle con imagen) |

Guards: `AutentificacionGuard` (token válido + contenedor en cookie si la URL trae
`:contenedor`) y `cookieRequiredGuard` (cookies obligatorias, si faltan expulsa al login).

### 2.3 Sesión y contenedor

1. Login → `usuario` a cookie y store.
2. Lista de contenedores: `GET /contenedor/usuariocontenedor/?usuario_id&serializador=lista&contenedor__reddoc=True`, con buscador y paginación. Marca `acceso_restringido` si el usuario tiene saldo y la fecha límite de pago ya pasó.
3. Conectar: `GET /contenedor/contenedor/{id}/` → store, luego `GET /general/configuracion/1` y, si trae `pos_documento_tipo`, `GET /general/documento_tipo/{id}` para guardar `{ documento_tipo_id, documento_tipo_nombre, contenedor_id }` en `configuracion`. Navega a `/dashboard/facturacion`.
4. El header permite volver a contenedores (limpia `contenedor` y `configuracion`) e ir a configuración.

### 2.4 Estado de facturación (el corazón)

`facturacion = { facturas: DocumentoFactura[], facturaActiva: uuid }`, persistido en localStorage.

- Cada **factura es un carrito abierto** identificado por `uuid`, con `contenedor`, `nombre` (por defecto "Factura", renombrable), `sede`, `almacen: 1`, `contacto_id: 1` ("Consumidor final"), `detalles[]`, `pagos[]` y los totales de cabecera.
- Los carritos se filtran por `contenedor`: al cambiar de contenedor se ven los suyos.
- La pestaña 0 no se puede eliminar ni renombrar; las demás sí (modal de confirmación).
- Al cobrar con éxito, el carrito se elimina y si no queda ninguno se crea uno nuevo.

Los **detalles** usan `item` (id del ítem) como clave: el mismo ítem agregado dos veces suma cantidad, no duplica línea.

### 2.5 Flujo de la caja, paso a paso

**Precondición.** Si `configuracion.documento_tipo_id` es 0 se muestra un aviso "Configuración requerida" con link a configuración y el botón Pagar queda deshabilitado.

**Catálogo (`FacturaItemsListaComponent` + `FacturaItemsCardComponent`).**

- `GET /general/item/?venta=true&inactivo=false&ordering=-favorito` al entrar.
- Tarjeta: imagen (DigitalOcean + placeholder), código, nombre, precio, badge de cantidad en el carrito, estrella de favorito (`PATCH /general/item/{id}/ { favorito }`, reordena en memoria) y, si `item.inventario`, "N disponibles" / "Agotado" con `item.disponible`.
- Clic en tarjeta → `POST /general/item/detalle/ { id, venta: true, compra: false }`, **filtra impuestos con `impuesto_impuesto_tipo_id === 1` (solo IVA)**, y si el cliente tiene `precio_id` → `GET /general/precio_detalle/consultar_precio/?item_id&precio_id` y pisa el precio con `vr_precio` si no es null. Luego agrega la línea o suma 1 a la cantidad.

**Búsqueda (`FacturaBuscarItemComponent`).**

- Dos modos con botones: por **nombre** (`nombre__icontains`, re-pinta el catálogo) y por **código de barras** (`codigo=` exacto; si `count === 1` agrega directo al carrito con el mismo pipeline de precio e impuestos; pensado para lector).
- Botón "+" abre modal "Nuevo ítem" con el formulario completo de ítem; al guardar refresca el catálogo.

**Carrito (`FacturaDetalleComponent`).**

- Selector de cliente (`ng-select`, `GET /general/contacto/seleccionar/?cliente=True&nombre_corto__icontains=`), default "Consumidor final" (`id: 1`). Al cambiar cliente se copia su `precio_id` a la factura.
- Botón "nuevo cliente": modal con el **formulario completo de contacto** (27 campos: identificación con validación de duplicado por `contacto/validar/`, dígito de verificación calculado en front, tipo persona que cambia validadores, ciudad con autocompletar, régimen, plazos, precio, asesor, banco…). Al guardar `POST /general/contacto/`.
- Por línea: contador +/- (cantidad 0 retira), lápiz abre drawer para editar **precio y cantidad**, papelera retira. Botón "Retirar" vacía el carrito con confirmación.
- Resumen: productos, cantidad total, subtotal, impuestos agrupados por `nombre_extendido`, total.
- Opciones del tab: renombrar, imprimir (sin implementar), eliminar.
- "Descargar PDF" genera un ticket de 80 mm con jsPDF con **datos de empresa hardcodeados** ("Lorem Ipsum", "NIT 900.000.000-0"): prototipo, no producto.

**Cálculo de totales (reducers).** El front es autoritativo y calcula por línea y por cabecera:

```
subtotal_línea   = round2(precio × cantidad)
impuesto_línea   = round2(subtotal × porcentaje/100)                 ← solo impuestos[0]
impuesto_operado = round2(subtotal × porcentaje/100 × impuesto_operacion)
total_línea      = round2(subtotal + impuesto)
por impuesto     = { total: subtotal × %/100, total_operado: … × operación, base: subtotal × %base/100 }
base_impuesto    = subtotal × porcentaje_base/100                    ← solo impuestos[0]
total_bruto      = subtotal + Σ impuestos.total
cabecera         = Σ de cada campo sobre las líneas
pago             = Σ pagos.pago
```

Deuda del legacy que **no** se copia: solo contempla un impuesto por línea; el resumen de impuestos usa `porcentaje / porcentaje_base` (correcto por casualidad cuando la base es 100); dos acciones NgRx comparten el mismo string de tipo (`actualizaImpuestoFacturaActiva` y `actualizarTotalBrutoFacturaActiva`), así que una dispara ambos reducers; mezcla `Math.round` con `parseFloat(toFixed(2))`; no hay descuentos. Nuestro kernel (`calcularImpuestosLinea` + `calcularResumen` en `@reddoc/core`) ya cubre varios impuestos, retenciones con signo y redondeo correcto, con tests.

**Cobro (`FacturaModalPagarComponent` → `FacturaMedioPagoEfectivoComponent`).**

- Modal con grid de medios: solo **Efectivo** habilitado; tarjeta crédito/débito, transferencia y pago combinado aparecen como "Próximamente". Al elegir efectivo fija `metodo_pago = 10` y `plazo_pago = 1` (hardcodeados).
- Formulario: valor (prellenado con el total, muestra "Pendiente" si es menor y "Cambio" si es mayor), asesor (opcional, `/general/asesor/`), cuenta bancaria (obligatoria si valor > 0, `/general/cuenta_banco/` sugiriendo la primera).
- Pipeline al confirmar (estados del botón: Validando → Guardando → Aprobando):
  1. `POST /inventario/existencia/validar/ { detalles }` → si `validar` es false, aborta.
  2. `POST /general/documento/nuevo/` con **toda** la factura del store + `fecha` y `fecha_vence` = hoy, `documento_tipo`, `numero: null`, `empresa: 1`, `contacto`, `detalles` (con `impuestos[]` embebidos) y `pagos[]` (`{ cuenta_banco, pago }`).
  3. `POST /general/documento/aprobar/ { id }`.
  4. Refresca el catálogo (existencias) y muestra "¡Venta exitosa!" con **Imprimir** (`POST general/documento/imprimir/` con `documento_tipo_id: 24` **hardcodeado** y `documento_id`, descarga el PDF del backend) o **Nueva factura**.

Nota: el valor del pago no se valida contra el total; si es mayor, manda el pago mayor (el backend nuevo rechaza aprobar en ese caso).

### 2.6 Configuración

Pestaña "General" (único módulo):

- **Documento tipo**: `GET /general/documento_tipo/?pos=true&serializador=autocompletar` y al elegir `PATCH /general/configuracion/1/ { pos_documento_tipo }` → relee el tipo y lo guarda en el store. Es configuración **del tenant**, compartida por todas las cajas.
- **Sede**: `GET /general/sede/?serializador=lista`; al elegir **solo** actualiza el store local y la `sede` de todos los carritos del contenedor. No se persiste en backend.

### 2.7 Historial

`GET /general/documento/?documento_tipo__pos=True&ordering=estado_aprobado,-fecha,-numero,-id&serializador=lista&page=`. Tabla con id, tipo, número, fecha, contacto, subtotal, impuesto, total, flags aprobado/anulado/electrónico/contabilizado e impresora por fila (`imprimir` con el `documento_tipo_id` de la fila). El detalle (`HistorialDetalleComponent`) está comentado entero: no existe.

### 2.8 Administración de ítems

Lista paginada (`venta=True`, `inactivo=False`), selección múltiple con eliminar (`DELETE` en paralelo), nuevo/editar (código, nombre, referencia, precio, costo, producto/servicio excluyentes, inventario, favorito, impuestos de venta con multiselect; en edición `validar-uso` bloquea tipo e inventario), detalle con **cargar imagen** en base64 (`POST /general/item/cargar-imagen/`).

### 2.9 Cuadre de caja

Ruta y componente existen, el template está vacío. No hay endpoint. No hay nada que migrar: hay que **definirlo**.

---

## 3. Lo que ya tenemos

### 3.1 `apps/pos` (hoy)

Esqueleto idéntico al de las otras SPA: login/registro desde `@reddoc/ui`, `authGuard`, `WorkspaceLayoutComponent` con un `DashboardComponent` vacío. **No** provee `CURRENT_APP`, `tenantInterceptor`, `TENANT_ROUTES`, `ENTITY_DATA_GATEWAY` ni rutas de contenedores. Es decir: hay que armarlo como `apps/turnos`, que es la referencia de app mono-módulo con tenant (`/contenedores` → `/t/:slug/...`).

### 3.2 `libs/` (cross-app, ya disponible)

| Pieza                                                                                                                                                                                                                                                                   | Dónde                          | Cubre del legacy                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Auth (cookies, refresh, guards), `errorInterceptor`, Sentry                                                                                                                                                                                                             | `@reddoc/core`                 | Login, token, manejo de errores                                       |
| `TenantService`, `ContenedorService`, `tenantInterceptor`, guards `tenantSlugMatchGuard`/`tenantAccessGuard`/`clearTenantGuard`/`rootRedirectGuard`, `TENANT_ROUTES`, flags `acceso_*`                                                                                  | `@reddoc/core` tenant          | Lista/selección de contenedor, subdominio (ahora cabecera `X-Tenant`) |
| `ContenedoresListComponent` con capabilities                                                                                                                                                                                                                            | `@reddoc/feature-contenedores` | Pantalla de contenedores (la usan ERP y turnos)                       |
| `DOCUMENT_TYPE_ID` (24 = POS electrónica, 27 = POS), tipos `Documento*Base`, `ENTITY_DATA_GATEWAY` + `HttpEntityDataGateway` (`list`, `getById`, `create`, `update`, `aprobar`, `desaprobar`, `anular`, `emitir`, `imprimir`, `exportExcel`), `DocumentoDetalleService` | `@reddoc/core` documento       | Crear, aprobar e imprimir el documento; listar el historial           |
| `calcularImpuestosLinea`, `calcularResumen`, `redondearMoneda`                                                                                                                                                                                                          | `@reddoc/core` calculo         | Todos los reducers de totales del legacy, mejor y con tests           |
| `ErpSelectDataService`, `SELECT_ENDPOINTS` (plazo pago, método pago, asesor, precio, almacén, ciudad, identificación…)                                                                                                                                                  | `@reddoc/core` data            | Los catálogos `seleccionar/`                                          |
| `FileDownloadService`, `triggerBrowserDownload`, `parseFilename`                                                                                                                                                                                                        | `@reddoc/core` http            | Descarga del PDF de `imprimir/`                                       |
| `FormErrorService`, `ToastService`, i18n, `FORMATO_FECHA`, `formatCop`                                                                                                                                                                                                  | `@reddoc/core`                 | Alertas, errores de formulario, formato                               |
| `ErpApiSelect`, `ErpApiAutocomplete`, `ErpContactoSelect`, `ErpAsesorSelect`, `CiudadAutocomplete`, `IdentificacionSelect`, `PhoneInput`, `FieldError`, `PageActions`, `FocusInvalid`, `AppSwitcher`                                                                    | `@reddoc/ui`                   | Selectores de cliente, asesor, cuenta banco; formulario de cliente    |

### 3.3 ERP (ERP-específico, candidato a subir a `libs/`)

El ERP ya tiene **la familia POS completa** en `apps/erp/src/app/features/venta/documentos/_shared/pos/`:

- `PosDocumentoRead` / `PosDocumentoPayload` / `posDocumentoToFormValue` / `formValueToPayload`: cabecera del POS (contacto, fecha, fecha_vence, plazo_pago, sede, almacén, método de pago, asesor, orden de compra, comentario) con `detalles` embebidos en alta.
- `PosDocumentoFormComponent` (cabecera + tabla de líneas + pagos en tabs) y `PosDocumentoDetailComponent` (ficha con aprobar/desaprobar/anular/imprimir/emitir vía `DocumentDetailActionsComponent`).
- Configs `FACTURA_POS_CONFIG` (27) y `FACTURA_POS_ELECTRONICA_CONFIG` (24), con listado en `BaseDocumentListComponent` (columnas y filtros `buildPosColumns`/`buildPosFilters`).

Y los building blocks que ese form usa:

| Pieza                                                                                                                                                                                 | Dónde (ERP)                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ComercialDetalleRead/Payload`, `comercialDetalleToPayload`, `tasasDelItem`, `toLineaCalculo`, `precioUnitarioConImpuestos`/`SinImpuestos`, `totalCantidad`                           | `features/documentos/comercial/*.ts`                     |
| `precioListaDeContacto` (lee `precio_id` de la opción del contacto)                                                                                                                   | `features/documentos/comercial/precio-lista-contacto.ts` |
| `ComercialDocumentoDetallesComponent` (tabla editable: al elegir ítem pide `item/{id}/` y `precio-detalle/?precio_id&item_id`, siembra impuestos de venta, recalcula)                 | `features/documentos/comercial/components/…`             |
| `PagoRead/Payload`, `DocumentoPagoService` (`documento-pago/`), `calcularPagos`, `createPagoGroup`, `DocumentoPagosComponent`, `registrarPagosDeAlta`                                 | `features/documentos/pagos/*`, `tablas-en-vivo`          |
| `ItemService` (`item/lista/` POST con filtros, `item/{id}/`, `validar-uso/`), `Item` model con `favorito`, `existencia`, `disponible`, `negativo`, `imagen_principal_url(_miniatura)` | `features/general/masters/item/`                         |
| `PrecioDetalleService.consultarPrecioItem`                                                                                                                                            | `features/general/masters/precio/`                       |
| `ErpItemAutocompleteComponent` (`item/seleccionar/?search=`, opción con `precio`)                                                                                                     | `core/components/item-autocomplete/`                     |
| `ImagenesDialogComponent` + `ImagenService` (`general/imagen/`, marcar principal)                                                                                                     | `core/components/imagenes-dialog/`                       |
| Formulario de contacto completo (DV, validación de identificación única, nombre corto, celular E.164)                                                                                 | `features/general/masters/contacto/`                     |
| `DocumentEstadosComponent`, `extractDocumentoId`                                                                                                                                      | `core/module-config/`                                    |

---

## 4. Comparación funcionalidad por funcionalidad

| Funcionalidad del legacy                 | Estado en el nuevo                                                                                                                                                   | Qué falta hacer                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Login / sesión                           | ✅ `@reddoc/ui` + `@reddoc/core`                                                                                                                                     | Nada                                                                                 |
| Elegir contenedor                        | ✅ `@reddoc/feature-contenedores` (ERP y turnos)                                                                                                                     | Cablear en `apps/pos` (rutas, `TENANT_ROUTES`, `CURRENT_APP: 'pos'`)                 |
| Acceso restringido por saldo/fecha       | ✅ Lo resuelve el backend/`tenantAccessGuard` y la lista de contenedores                                                                                             | Nada                                                                                 |
| Configuración: tipo de documento POS     | ⚠️ Backend: `GenDocumentoTipo.pos` existe (solo lectura) pero **no hay `pos_documento_tipo` en `GenConfiguracion`** ni filtro `pos` en `documento-tipo/seleccionar/` | Decidir dónde persiste (ver §6 y §8)                                                 |
| Configuración: sede                      | ⚠️ Legacy solo local. Backend: `sede/seleccionar/` existe; el documento acepta `sede`                                                                                | Persistir por tenant+dispositivo (localStorage) o pedir campo al backend             |
| Catálogo de ítems en tarjetas            | ⚠️ Datos: `item/lista/` POST (`venta`, `inactivo`, orden `-favorito`) devuelve `GenItem` con favorito, existencia, disponible e imagen. UI: no existe                | Componente de catálogo nuevo (Tailwind + PrimeNG)                                    |
| Búsqueda por nombre                      | ✅ `item/lista/` con filtro `contiene` o `item/seleccionar/?search=` (nombre, código o referencia)                                                                   | UI                                                                                   |
| Búsqueda por código de barras            | ✅ `item/lista/` con `codigo =`                                                                                                                                      | UI + comportamiento "agrega directo si hay un único resultado"                       |
| Favorito desde la tarjeta                | ✅ `PATCH item/{id}/` (ERP ya lo escribe en el form)                                                                                                                 | Acción puntual en el catálogo                                                        |
| Precio por lista del cliente             | ✅ `PrecioDetalleService.consultarPrecioItem` + `precioListaDeContacto`                                                                                              | Subir a `libs/` y reusar                                                             |
| Impuestos del ítem                       | ✅ `tasasDelItem(item, 'venta')` (todos los de venta, no solo IVA)                                                                                                   | Subir a `libs/`                                                                      |
| Varios carritos en pestañas, persistidos | ❌ No existe                                                                                                                                                         | Store con signals + localStorage por tenant                                          |
| Cliente por defecto "Consumidor final"   | ⚠️ El legacy asume `contacto id=1`                                                                                                                                   | Confirmar con backend si cada tenant lo trae; si no, resolverlo por búsqueda         |
| Nuevo cliente desde la caja              | ⚠️ El ERP tiene el formulario completo como página, no como modal ni en `libs/`                                                                                      | Decidir alcance (modal reducido vs. formulario completo)                             |
| Editar precio/cantidad de línea          | ✅ Lógica de línea (`lineBruto`, recompute) en el ERP                                                                                                                | UI                                                                                   |
| Resumen con impuestos agrupados          | ✅ `calcularResumen`                                                                                                                                                 | UI                                                                                   |
| Validar existencia antes de cobrar       | ❌ `inventario/existencia/validar/` **no existe**                                                                                                                    | Preguntar si `aprobar/` valida stock; en front usar `disponible`/`negativo` del ítem |
| Crear documento con líneas               | ✅ `gateway.create` con `GenDocumentoCrearRequest` (`detalles[].impuestos_ids`)                                                                                      | Mapper POS (ya existe en ERP, subir)                                                 |
| Registrar pago                           | ✅ `documento-pago/` (recurso aparte, varios pagos por documento)                                                                                                    | Flujo: crear → pagos → aprobar. **Habilita pago combinado** sin esfuerzo extra       |
| Aprobar                                  | ✅ `gateway.aprobar` (`POST documento/aprobar/ { id }`)                                                                                                              | Nada                                                                                 |
| Imprimir                                 | ✅ `gateway.imprimir` (`POST documento/imprimir/` con filtro `id`), formato lo decide el tipo                                                                        | Confirmar que el formato POS del backend es ticket y cómo se manda a impresora       |
| PDF local jsPDF                          | ❌ Prototipo con datos falsos                                                                                                                                        | No portar; si se quiere ticket local, diseñarlo con datos de `configuracion/campos/` |
| Historial                                | ✅ `BaseDocumentListComponent` es ERP; pero `documento/lista/` + `DocumentoListRowBase` + `lib-data-table` sí son cross-app                                          | Lista simple en POS con `documento_tipo_id in (24, 27)` y botón imprimir             |
| Ficha del documento                      | ⚠️ ERP tiene `PosDocumentoDetailComponent` (ERP-específico)                                                                                                          | Versión POS ligera (o enlazar al ERP vía app-switcher)                               |
| CRUD de ítems                            | ⚠️ ERP completo; en POS no existe                                                                                                                                    | Decidir si el POS edita ítems o solo crea rápido (ver §8)                            |
| Imagen de ítem                           | ✅ `general/imagen/` + `ImagenesDialog` (ERP)                                                                                                                        | Opcional en POS                                                                      |
| Cuadre de caja                           | ❌ Legacy vacío, backend sin nada                                                                                                                                    | Definir producto y backend                                                           |
| PWA/offline                              | ❌ No hay service worker en ninguna app                                                                                                                              | Decidir si el POS lo necesita                                                        |

---

## 5. Endpoints: legacy vs backend actual

Verificado contra el OpenAPI del 2026-10-14 (`/api/contenedor/schema/`). Los
endpoints de `/contenedor/*` no aparecen en ese schema; ya los consume
`ContenedorService` de `@reddoc/core`, así que no son un hueco.

| Legacy                                                               | Backend actual                                                                                | Nota                                                                           |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POST /general/documento/nuevo/`                                     | `POST /general/documento/` (`GenDocumentoCrearRequest`)                                       | `detalles[]` embebidos con `impuestos_ids`; **`pagos` no van en el documento** |
| `POST /general/documento/aprobar/ {id}`                              | ✅ igual                                                                                      | Rechaza 400 si Σ pagos > total                                                 |
| `POST general/documento/imprimir/ {documento_tipo_id, documento_id}` | `POST /general/documento/imprimir/ { filtros: [{id =}] }`                                     | Ya implementado en `HttpEntityDataGateway.imprimir`                            |
| `GET /general/documento/?documento_tipo__pos=True…`                  | `POST /general/documento/lista/ { filtros, ordenamientos }`                                   | Filtrar `documento_tipo_id in [24,27]`; `ordering` no existe                   |
| `GET /general/documento_tipo/?pos=true`                              | `GET /general/documento-tipo/seleccionar/?search=` (sin `pos`) / `POST documento-tipo/lista/` | Hay que confirmar si `pos` está en `campos_filtrables` del `lista/`            |
| `GET /general/configuracion/1` + `PATCH …/1/ {pos_documento_tipo}`   | `GET configuracion/campos/?campos=` + `PATCH configuracion/actualizar/`                       | **No existe ningún campo `pos_*`**                                             |
| `GET /general/item/?venta&inactivo&ordering`                         | `POST /general/item/lista/` (filtros + `ordenamientos: ['-favorito']`)                        | Devuelve `GenItem` completo (favorito, existencia, disponible, imagen)         |
| `POST /general/item/detalle/ {id, venta}`                            | `GET /general/item/{id}/`                                                                     | Trae `impuestos[]` con `impuesto_venta`, `impuesto_impuesto_tipo_id`…          |
| `GET /general/precio_detalle/consultar_precio/`                      | `GET /general/precio-detalle/?precio_id&item_id`                                              | Ya envuelto en `PrecioDetalleService.consultarPrecioItem`                      |
| `PATCH /general/item/{id}/ {favorito}`                               | ✅ igual                                                                                      |                                                                                |
| `POST /general/item/cargar-imagen/ {base64}`                         | `POST /general/imagen/` + `POST /general/imagen/{id}/principal/`                              | Ya envuelto en `ImagenService` (ERP)                                           |
| `POST /general/item/validar-uso/ {id}`                               | `GET /general/item/{id}/validar-uso/`                                                         | Ya en `ItemService.validarUso`                                                 |
| `POST /inventario/existencia/validar/ {detalles}`                    | **No existe**                                                                                 | Solo `inventario/informe/lista/` (saldo consolidado por ítem)                  |
| `GET /general/contacto/seleccionar/?cliente&nombre_corto__icontains` | `GET /general/contacto/seleccionar/?cliente=true&search=`                                     | Devuelve `precio_id`, `plazo_pago_id`                                          |
| `POST /general/contacto/` + `validar/` + `consulta-dian/`            | ✅ iguales                                                                                    |                                                                                |
| `GET /general/asesor/`, `/general/cuenta_banco/`                     | `…/asesor/seleccionar/`, `…/cuenta-banco/seleccionar/`                                        | Guion medio                                                                    |
| `GET /general/sede/`                                                 | `GET /general/sede/seleccionar/`                                                              |                                                                                |
| `GET /general/impuesto/seleccionar/?venta=True`                      | ✅ igual                                                                                      |                                                                                |

Contratos relevantes del documento (para el payload del POS):

- `GenDocumentoCrearRequest`: `documento_tipo` (obligatorio), `contacto`, `fecha`, `fecha_vence`, `plazo_pago`, `metodo_pago`, `asesor`, `sede`, `almacen`, `resolucion`, `comentario`, `detalles[]`.
- `GenDocumentoDetalleRequest`: `item`, `cantidad`, `precio`, `porcentaje_descuento`, `almacen`, `impuestos_ids[]`, `detalle`. Los montos (`subtotal`, `impuesto`, `total`) los calcula el backend al persistir; el front los calcula para mostrar.
- `GenDocumentoPagoRequest`: `documento`, `cuenta_banco`, `pago`. Requiere documento modificable, tipo que cobre y cuenta bancaria con cuenta contable.
- `GenDocumento` (read) expone `pago`, `pendiente`, `cue`, flags electrónicos, `resolucion_prefijo/numero`.

---

## 6. Huecos del backend

1. **Configuración del POS por tenant.** No hay `pos_documento_tipo` (ni `pos_sede`, `pos_cuenta_banco`, `pos_almacen`) en `GenConfiguracion`. Opciones: (a) pedir al backend campos `pos_*` en `configuracion/campos/` + `actualizar/`, igual que `gen_uvt` y `gen_emitir_automaticamente`; (b) guardar la configuración por **tenant + dispositivo** en localStorage (cada caja elige su tipo de documento, sede, cuenta de efectivo). La (b) es defendible para un POS (cada caja física tiene su sede y su caja), y no bloquea.
2. **Filtro `pos` de tipos de documento.** `documento-tipo/seleccionar/` solo admite `search`. Hay que probar si `documento-tipo/lista/` acepta `{ propiedad: 'pos', operador: '=', valor: true }` (la whitelist `campos_filtrables` no se publica). Alternativa sin backend: el POS ya sabe que sus tipos son 24 y 27 (`DOCUMENT_TYPE_ID`), y elige entre "factura POS" y "factura POS electrónica".
3. **Validación de existencias.** No existe `existencia/validar/`. Preguntar al backend si `aprobar/` (o el `POST documento/`) rechaza vender sin stock cuando el ítem no es `negativo`. Mientras tanto el front puede avisar con `disponible` del ítem (el catálogo ya lo trae) y refrescar tras cada venta, como hacía el legacy.
4. **Cuadre de caja.** No hay modelo ni endpoint. Lo más cercano es agrupar `documento-pago` por `cuenta_banco` y fecha desde el front, pero un cuadre real (apertura, base, arqueo, cierre) es un desarrollo de backend.
5. **Contacto "Consumidor final" id 1.** Supuesto del legacy. Confirmar que todo tenant lo tiene con ese id o resolverlo buscando por identificación `222222222222`.
6. **Formato de impresión.** `imprimir/` devuelve el PDF que define `GenDocumentoTipo.formato`. Confirmar que el tipo 24/27 imprime ticket de 80 mm y si hace falta un endpoint que devuelva algo imprimible directo (ESC/POS o HTML) para impresora térmica.
7. **`item/seleccionar/` no trae favorito ni existencia.** No es hueco: el catálogo usa `item/lista/`.

---

## 7. Propuesta de arquitectura para `apps/pos`

### 7.1 Esqueleto (copiar el patrón de `apps/turnos`)

```
apps/pos/src/app/
├── app.config.ts            + CURRENT_APP 'pos', tenantInterceptor, TENANT_ROUTES, ENTITY_DATA_GATEWAY, locale es-CO, i18n propio
├── app.routes.ts            '' → rootRedirectGuard; /auth; /contenedores (shell); /t/:tenantSlug (workspace)
├── layouts/
│   ├── shell-layout/        contenedores
│   └── workspace-layout/    header compacto: tenant badge, tabs de carritos?, user menu, app-switcher
├── features/
│   ├── contenedores/        ContenedoresListComponent de @reddoc/feature-contenedores
│   ├── caja/                la pantalla de venta (camino propio, no es master ni documento del framework)
│   │   ├── carritos.store.ts        signals + localStorage por tenant (reemplaza NgRx facturacion)
│   │   ├── configuracion-caja.store.ts   tipo doc, sede, almacén, cuenta efectivo, asesor (por tenant+dispositivo)
│   │   ├── catalogo/                grid de tarjetas + búsqueda nombre/código
│   │   ├── carrito/                 líneas, cliente, resumen, acciones
│   │   └── cobro/                   modal de cobro (medios, cambio, pipeline crear→pagar→aprobar→imprimir)
│   ├── historial/           lista con lib-data-table sobre documento/lista/ (24 y 27) + imprimir
│   └── configuracion/       la configuración de la caja
└── i18n/
```

- Rutas finales: `/t/:slug/caja`, `/t/:slug/historial`, `/t/:slug/configuracion`. Cuadre de caja e ítems quedan fuera hasta decidirlos.
- El ERP ya restringe por `acceso_venta`; el POS puede exigir el mismo flag en el `tenantAccessGuard` (hay que ver si el plan POS del contenedor es `acceso_venta` o se crea `acceso_pos`).

### 7.2 Qué subir a `libs/` antes de empezar (para no duplicar el ERP)

Candidatos sin PrimeNG (puros o solo HTTP), que hoy viven en el ERP y el POS necesita tal cual:

| Mover                                                                                                                                                                                  | Destino sugerido                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `ComercialDetalleRead/Payload`, `comercialDetalleToPayload`, `comercialDetalleToFormValue`, `tasasDelItem`, `toLineaCalculo`, `lineBruto/…/lineNeto`, `precioUnitarioCon/SinImpuestos` | `libs/core/documento/comercial/` |
| `PosDocumentoRead/Payload` + mapper                                                                                                                                                    | `libs/core/documento/pos/`       |
| `PagoRead/Payload`, `DocumentoPagoService`, `calcularPagos`                                                                                                                            | `libs/core/documento/pagos/`     |
| `Item`, `ItemImpuesto`, `ItemService` (al menos `list`, `getById`, `update` favorito)                                                                                                  | `libs/core/item/` (o `catalogo`) |
| `PrecioDetalleService.consultarPrecioItem`                                                                                                                                             | `libs/core/precio/`              |
| `precioListaDeContacto`                                                                                                                                                                | junto al comercial               |

Los componentes PrimeNG del ERP (tabla de líneas editable, pagos en tabla, ficha) **no** se mueven: el POS tiene otra UX (tarjetas y carrito). Si el formulario de cliente se quiere completo en el POS, ese sí habría que subirlo a `@reddoc/ui` (ya tiene `CiudadAutocomplete`, `IdentificacionSelect`, `PhoneInput`), o abrir una versión reducida (identificación, nombre, correo, celular, ciudad) y remitir al ERP para el resto.

El `tasasDelItem` del ERP depende del tipo `Item` del master, así que mover ítem y comercial va junto.

### 7.3 Flujo de cobro propuesto

```
[carrito válido]
  → (opcional) aviso de stock con item.disponible si !item.negativo
  → POST documento/ { documento_tipo: 24|27, contacto, fecha, fecha_vence, plazo_pago, metodo_pago,
                      sede, almacen, asesor, detalles[{item, cantidad, precio, impuestos_ids, almacen}] }
  → POST documento-pago/ × N  { documento, cuenta_banco, pago }     (efectivo, tarjeta, transferencia…)
  → POST documento/aprobar/ { id }
  → éxito: imprimir (gateway.imprimir) | nueva venta
```

Si falla un pago o aprobar, el documento ya existe sin aprobar: mostrarlo en
historial con sus flags (como hace el ERP) en vez de dejar el carrito en un
estado ambiguo. `metodo_pago` y `plazo_pago` salen de los catálogos
(`SELECT_ENDPOINTS`), no de ids quemados.

### 7.4 Carritos (reemplazo del store NgRx)

Un `CarritosStore` con signals: `carritos: Carrito[]` (uuid, nombre, contacto
opción, líneas `ComercialDetalleFormRawValue`-like, creado), `activoId`,
`computed` de resumen por carrito con `calcularResumen`. Persistido en
localStorage bajo `pos:carritos:<tenantSlug>` (misma idea que
`FilterStorageService`). Sin `BehaviorSubject`, sin NgRx, sin cookie de usuario.

---

## 8. Decisiones tomadas (2026-10-14)

1. **Tipo de documento y configuración de la caja: por tenant + dispositivo, en localStorage.** Cada caja elige su tipo de documento (factura POS 27 o factura POS electrónica 24, fijos desde `DOCUMENT_TYPE_ID`, sin depender de un filtro `pos` del backend), su sede, su almacén, su cuenta de efectivo y, opcionalmente, su asesor. No se piden campos `pos_*` al backend. Si más adelante se quiere compartir entre cajas, el store es el único punto que cambia.
2. **Medios de pago: solo efectivo**, pero con la estructura preparada para sumar otros (cada medio es una cuenta bancaria registrada vía `documento-pago/`; el modal de cobro se arma sobre una lista de medios con uno solo habilitado).
3. **Existencias: se bloquea desde el front.** Un ítem con `inventario` y sin `negativo` no se puede agregar por encima de `disponible`; el catálogo se refresca tras cada venta. No se asume validación del backend.
4. **Impresión: el PDF del backend** (`gateway.imprimir`). No se porta el jsPDF local.
5. **Cuadre de caja: no entra** en esta migración.
6. **Ítems y clientes: modal rápido** con pocos campos desde la caja. El CRUD completo queda en el ERP (app-switcher).
7. **Carritos en pestañas: sí**, varias ventas abiertas en paralelo, con nombre editable y persistidas por tenant.

Pendientes de verificación (no bloquean el arranque, se cierran en el primer sprint):

- **Consumidor final.** El legacy asume `contacto id = 1`. Se resuelve buscando por identificación en `contacto/seleccionar/` y se cae a "elegir cliente" si no existe; confirmar con backend si el id es estable.
- **PWA/offline.** No entra; el legacy registraba el service worker sin lógica offline real.
