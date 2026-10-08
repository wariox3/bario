import type { ErpSelectOption } from '@reddoc/core';
import type { DetalleFormRawValue } from './servicio-documento-detalle.types';

/**
 * Valores crudos del formulario de un documento de servicio (`form.getRawValue()`).
 *
 * `contacto` guarda la opción completa (`{ id, nombre }`) del autocomplete;
 * `estrato`/`sector`/`salario` son numéricos; `fecha` es un `Date` del
 * datepicker; `detalles` son las líneas de servicio. El mapper los normaliza
 * al payload de la API.
 */
export interface ServicioDocumentoFormRawValue {
  readonly contacto: ErpSelectOption | null;
  readonly fecha: Date | null;
  readonly sector: ErpSelectOption | null;
  readonly estrato: number | null;
  readonly salario: number | null;
  readonly detalles: readonly DetalleFormRawValue[];
}
