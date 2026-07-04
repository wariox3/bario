import type { ErpSelectOption } from '@erp/core/components/api-select/erp-api-select.component';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Documento soporte (`form.getRawValue()`).
 *
 * Los selects guardan la opción completa (`{ id, nombre }`); `fecha` y
 * `fecha_vence` son `Date` del datepicker; `orden_compra`/`comentario` son
 * texto; `detalles` son las líneas comerciales. El mapper los normaliza al
 * payload de la API.
 */
export interface DocumentoSoporteFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly fecha_vence: Date | null;
  readonly plazo_pago: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly metodo_pago: ErpSelectOption | null;
  readonly forma_pago: ErpSelectOption | null;
  readonly resolucion: ErpSelectOption | null;
  readonly orden_compra: string | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
