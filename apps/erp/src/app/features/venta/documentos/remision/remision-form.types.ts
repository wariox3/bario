import type { ErpSelectOption } from '@reddoc/core';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';

/**
 * Valores crudos del formulario de Remisión (`form.getRawValue()`).
 *
 * Cabecera fiel al legacy renderizado: los selects (cliente, sede, almacén,
 * asesor) guardan la opción completa (`{ id, nombre }`); `fecha` es un `Date` del
 * datepicker; `comentario` es texto libre; `detalles` son las líneas comerciales.
 * El mapper los normaliza al payload de la API.
 */
export interface RemisionFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly sede: ErpSelectOption | null;
  readonly almacen: ErpSelectOption | null;
  readonly asesor: ErpSelectOption | null;
  readonly comentario: string | null;
  readonly detalles: readonly ComercialDetalleFormRawValue[];
}
