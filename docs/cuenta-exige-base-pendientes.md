# Cuenta que exige base — pendientes

Contexto: `contabilidad/cuenta/seleccionar/` devuelve `exige_base`, `exige_contacto` y `exige_centro_costo` por cuenta. El `<app-cuenta-select>` los pasa en la opción elegida, y la línea contable (`createCuentaDetalleGroup`, en `apps/erp/src/app/features/documentos/contable/contable-documento-detalle.form.ts`) marca la `base` con el error `baseExigida` cuando la cuenta la exige y la base está en 0. Como la tabla de cuentas es compartida, aplica a egreso, pago, asiento, cierre y las cuentas de la factura de compra.

## 1. Validar la base en líneas ya guardadas ❌ PENDIENTE (backend)

La validación solo corre cuando la cuenta se elige **en el selector**. Estas líneas no traen la bandera, así que no se validan:

- Las que se cargan al editar un documento (`GET /general/documento-detalle/`): el read trae `cuenta`, `cuenta_codigo` y `cuenta_nombre`, pero no `exige_base`.
- Las que nacen del cruce de cartera («Agregar documento»): la cuenta sale de `resolverCruce`, que tampoco la trae.

Consecuencia: si se abre en edición un documento con una línea de retención en base 0, se puede volver a guardar sin aviso, salvo que se vuelva a elegir la cuenta.

**Qué pedir al backend:** sumar `cuenta_exige_base` (y, de paso, `cuenta_exige_contacto` y `cuenta_exige_centro_costo`) al serializer de lectura de `documento-detalle`.

**Qué hacer en el front cuando llegue:**

1. Declarar los campos en `CuentaDetalleRead` (`contable-documento-detalle.model.ts`).
2. En `cuentaDetalleToFormValue` (`contable-documento-detalle.mapper.ts`), pasarlos a la opción `cuenta` como `exige_base`, etc. El validador los lee de ahí sin más cambios.
3. Si el cruce también los recibe, hacer lo mismo en `documentoPendienteToFormValue`.

## 2. Contacto y centro de costo exigidos ❌ PENDIENTE (front)

`exige_contacto` y `exige_centro_costo` ya llegan en la opción de cuenta, pero todavía no se validan. Se puede aplicar la misma regla de `baseExigidaValidator` a `contacto` y `centro_costo`, siempre que el documento muestre esas columnas (`showContacto`, `showCentroCosto`).
