import type { ErpSelectOption, ComercialDetalleFormRawValue } from '@reddoc/core';
import type { CuentaDetalleFormRawValue } from '@erp/features/documentos/contable/contable-documento-detalle.types';

/**
 * Valores crudos del formulario de Factura de compra recurrente
 * (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es `Date`
 * del datepicker; `orden_compra` es texto; `detalles` son las líneas
 * comerciales (ítems) y `cuentas` los asientos contables manuales. El mapper los normaliza al payload de la API.
 */
export interface FacturaCompraRecurrenteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly forma_pago: ErpSelectOption | null;
  readonly centro_costo: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
  readonly cuentas: readonly CuentaDetalleFormRawValue[];
}
