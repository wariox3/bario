import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Factura de venta recurrente
 * (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` es un
 * `Date` que el form sostiene sin pintar (la plantilla no se fecha a mano); `orden_compra`, `remision` y `comentario` son texto;
 * `detalles` son las líneas comerciales. El mapper los normaliza al payload de
 * la API.
 */
export interface FacturaVentaRecurrenteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly remision: string | null;
  readonly comentario: string | null;
  /**
   * Opción del catálogo de asesores. Su etiqueta viene en `nombre_corto` (no en
   * `nombre`): en edición se siembra como `{ id, nombre: '' }` y el select le
   * pone nombre al casar contra su catálogo.
   */
  readonly asesor: ErpSelectOption | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
