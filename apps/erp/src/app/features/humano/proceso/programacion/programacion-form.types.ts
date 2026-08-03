import type { ErpSelectOption } from '@reddoc/core';
import type { ProgramacionBanderas } from './programacion.model';

/**
 * Valores crudos del formulario de cabecera (`form.getRawValue()`).
 *
 * Hereda las 17 banderas para que el tipo y la metadata no se desincronicen:
 * agregar una bandera al modelo obliga a declararla en el formulario.
 *
 * `periodo` no es un control editable: lo deriva el grupo elegido (ver
 * `programacion.mapper.ts`), así que viaja como id suelto.
 */
export interface ProgramacionFormRawValue extends ProgramacionBanderas {
  readonly nombre: string | null;
  readonly fecha_desde: Date | null;
  readonly fecha_hasta: Date | null;
  readonly fecha_hasta_periodo: Date | null;
  readonly comentario: string | null;
  readonly pago_tipo: ErpSelectOption | null;
  readonly grupo: ErpSelectOption | null;
}
