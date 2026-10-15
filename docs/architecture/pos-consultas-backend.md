# POS: consultas y riesgos para revisar con backend

> Lo que el POS nuevo necesita confirmar o pedir al backend. Sale de la
> migración (`pos-migracion.md` y `pos-migracion-sprints.md`). Cada punto dice
> qué hace hoy el front, por qué importa y qué se le pregunta al backend.

## Riesgos

### 1. Factura duplicada si se pierde la respuesta del `POST documento/`

- **Hoy:** el cobro crea el documento, registra el pago y lo aprueba. Si falla
  después de crear, la venta guarda el id y el reintento retoma sin duplicar.
- **El hueco:** si el backend crea el documento pero la respuesta no llega al
  navegador (corte de red, timeout), el POS no conoce el id. Un reintento crea
  una segunda factura.
- **Pregunta:** ¿se puede aceptar una clave de idempotencia en
  `POST /general/documento/` (cabecera `Idempotency-Key` o campo `uuid`) que, si
  se repite, devuelva el documento ya creado en vez de crear otro? El POS ya
  tiene un identificador único por venta para mandar.

### 2. Stock: el front bloquea, ¿el backend también?

- **Hoy:** el POS no deja vender más que el `disponible` del ítem (si maneja
  inventario y no admite negativo). El tope es por venta: dos ventas abiertas en
  la misma caja, o dos cajas, pueden sumar más que el disponible.
- **El hueco:** no existe `inventario/existencia/validar/` del legacy. Si
  `aprobar/` no valida existencias, se puede aprobar una venta sin stock.
- **Pregunta:** ¿`POST documento/aprobar/` rechaza una venta cuando un ítem no
  tiene disponible y no admite negativo? Si no, ¿se puede agregar esa validación
  o un endpoint para validar las líneas antes de cobrar?

### 3. Factura POS electrónica (tipo 24) no se emite desde el POS

- **Hoy:** el POS la crea y la aprueba, pero no llama a `documento/emitir/`.
- **Pregunta:** ¿la aprobación la emite sola cuando `gen_emitir_automaticamente`
  está activo? Si no, ¿el POS debe llamar a `emitir/` justo después de aprobar, o
  la emisión se deja al ERP?

## Confirmaciones

### 4. Filtros `venta` e `inactivo` en `POST item/lista/`

- **Hoy:** el catálogo los manda y además filtra en el navegador, por si el
  backend los ignora.
- **Pregunta:** ¿están en `campos_filtrables` del `lista/` de ítems? Si no lo
  están, la paginación trae páginas con menos productos de los pedidos.

### 5. Contacto "Consumidor final"

- **Hoy:** se busca en `contacto/seleccionar/?cliente=True&search=2222222222` y
  se toma el que tenga identificación de solo doses. El legacy asumía `id = 1`.
- **Pregunta:** ¿todo tenant nace con ese contacto? ¿Con qué identificación
  exacta (`222222222222`)? ¿Su id es estable?

### 6. Método de pago efectivo y plazo de contado

- **Hoy:** el método de pago se busca en `metodo-pago/seleccionar/` por
  `codigo = '10'` (DIAN) y el plazo en `plazo-pago/seleccionar/` por `dias = 0`,
  recorriendo páginas. El legacy los tenía fijos (`metodo_pago 10`,
  `plazo_pago 1`).
- **Pregunta:** ¿todo tenant tiene ambos? ¿`seleccionar/` admite `search` por
  código o un `page_size` para no recorrer páginas?

### 7. Formato de impresión del POS

- **Hoy:** se imprime con `POST documento/imprimir/` y se descarga el PDF.
- **Pregunta:** ¿los tipos 24 y 27 imprimen en formato ticket (80 mm)? ¿Hay una
  salida pensada para impresora térmica, o el PDF es la única?

### 8. Crear factura POS con líneas embebidas

- **Hoy:** `POST documento/` con `documento_tipo` 27 o 24 y `detalles[]` con
  `item`, `cantidad`, `precio`, `almacen` e `impuestos_ids`.
- **Pregunta:** confirmar que responde 201 con `id` para ambos tipos y que
  calcula los totales a partir de las líneas.

## Resuelto

- **Tipo de documento POS de la empresa** (2026-10-15). Backend agregó
  `ven_pos_documento_tipo` (+ `_nombre`, solo lectura) a `GenConfiguracion`; el
  POS lo lee por `configuracion/campos/` y lo guarda por `actualizar/`. El
  schema no dice si valida que sea un tipo POS: el front acepta solo 24 y 27 y
  trata cualquier otro como no configurado.

## Pedidos a futuro (no bloquean)

- **Valores por defecto de la caja en el backend** (almacén, cuenta de
  efectivo). Hoy son de cada navegador. Solo si se quiere administrarlos desde el
  ERP.
- **Filtro `pos` en `documento-tipo/seleccionar/`.** No existe; el POS usa los
  tipos 24 y 27 fijos.

## Fuera de esta migración

Decidido no hacerlo en la migración del POS (2026-10-14). Queda registrado para
retomarlo; los que necesitan backend lo dicen.

- **Cuadre de caja.** No hay nada que portar: en el POS anterior la pantalla
  estaba vacía. Necesita modelo y endpoints en el backend (apertura con base,
  arqueo por medio de pago, cierre) antes de cualquier pantalla.
- **Medios de pago distintos de efectivo y pago combinado** (tarjeta crédito y
  débito, transferencia). El front ya está preparado: cada medio declara su
  código DIAN en `cobro/medios-pago.ts` y el backend acepta varios pagos por
  documento. Falta habilitarlos, darles su formulario y su cuenta bancaria en la
  configuración de la caja.
- **Ficha del documento dentro del POS** (ver una venta con sus líneas y pagos,
  anularla, emitirla a la DIAN). Hoy el historial solo lista e imprime; el resto
  se hace en el ERP.
- **Edición de ítems y clientes** más allá del alta rápida. El CRUD completo
  queda en el ERP.
- **Funcionamiento sin conexión (PWA).** El POS anterior registraba un service
  worker sin lógica offline real. Vender sin red exigiría guardar los documentos
  localmente y sincronizarlos, con la idempotencia del punto 1 resuelta.
- **Impresión directa a impresora térmica** (ESC/POS) sin pasar por el PDF.
  Depende de la respuesta del punto 7.
