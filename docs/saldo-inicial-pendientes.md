# Saldo inicial — pendientes con backend

Contexto: el saldo inicial es la cartera con la que una empresa arranca en el sistema. Existe en Cartera (cuentas por cobrar, `documento_tipo_id` 18) y en Tesorería (cuentas por pagar, `documento_tipo_id` 19). En el ERP anterior era un listado con importación por Excel: cada fila creaba un documento sin líneas, sin formulario ni ficha.

El listado de ambos módulos ya está en `apps/erp/src/app/features/documentos/saldo-inicial/`. La importación está encendida para probarla (`canImportExcel: true`), pero el contrato del backend todavía no declara cómo saber de qué tipo es el archivo.

## Qué pedir al backend ❌ PENDIENTE

Estado según el OpenAPI del 2026-11-09.

### 1. Indicar el tipo al importar (bloquea)

`POST /general/documento/importar/` solo declara el campo `archivo` (`ImportarRequestRequest`). El ERP anterior enviaba también `documento_tipo_id`, y sin eso no se distingue un saldo de CxC de uno de CxP.

**Pedido:** aceptar `documento_tipo_id` en el multipart, junto a `archivo`. El front ya lo envía.

### 2. Importar el valor del saldo y la cuenta (bloquea)

La plantilla del ERP anterior trae `NUMERO`, `FECHA`, `FECHA_VENCE`, `CONTACTO`, `TOTAL` y `CUENTA`, una fila por documento. `total` es `readOnly` en `GenDocumento`, igual que `pendiente`.

**Pedido:** que la importación de estos tipos tome `TOTAL` y `CUENTA` del Excel y deje `total` y `pendiente` con ese valor, para que el saldo aparezca en los pendientes del pago y en los informes de cartera. Confirmar si crea una línea interna o guarda directamente la cabecera.

### 3. Plantilla por tipo

`GET /general/documento/importar-ejemplo/` no declara parámetros y devuelve la plantilla genérica de documento.

**Pedido:** aceptar `?documento_tipo_id=18|19` y devolver las columnas del punto 2. El front ya lo envía.

### 4. Confirmar llaves del Excel

En el ERP anterior `CONTACTO` era el ID interno del contacto. Confirmar si sigue siendo el ID o pasa a ser la identificación, y si `CUENTA` es el ID o el código contable.

### 5. Estado al importar

El ERP anterior no tenía pantalla para aprobar estos documentos. Confirmar si quedan aprobados al importar, y si generan contabilidad. Si no quedan aprobados, hace falta definir dónde se aprueban: es lo que decide si se construye una ficha.

## Qué hacer en el front cuando llegue

1. Dejar `canImportExcel` en `true` en `saldo-inicial.config.ts` y actualizar su comentario.
2. Si el backend usa otro nombre de campo, ajustarlo en `HttpEntityDataGateway.importarExcel` y en `importExample` de `BaseDocumentListComponent`.
3. Probar con un archivo por cada tipo, un archivo con errores, y verificar que el saldo aparezca en los pendientes del pago o del egreso.
4. Si el punto 5 lo exige, sumar la ficha: `canView: true` y la ruta `detalle/:id` en `saldo-inicial.routes.ts`.
