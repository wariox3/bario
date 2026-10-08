import type { ImpuestoLinea } from '@reddoc/core';
import type { ErpSelectOption } from '@reddoc/core';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';

/** Re-export: `ItemOption` vive ahora en `core/components` (infra compartida). */
export type { ItemOption };

/**
 * Valores crudos de una línea de detalle (`form.getRawValue()` de cada
 * `FormGroup` del `FormArray`). El mapper los normaliza al payload de la API.
 */
export interface DetalleFormRawValue {
  /** Id de la línea persistida (`null` mientras no exista en backend). */
  readonly id: number | null;
  readonly item: ItemOption | null;
  readonly puesto: ErpSelectOption | null;
  readonly cantidad: number | null;
  readonly precio: number | null;
  readonly fecha_desde: Date | null;
  readonly fecha_hasta: Date | null;
  readonly hora_desde: Date | null;
  readonly hora_hasta: Date | null;
  readonly modalidad: ErpSelectOption | null;
  readonly salario: number | null;
  readonly programar: boolean;
  readonly dias_semana: number[];
  readonly festivo: boolean;
  readonly cortesia: boolean;
  /** Línea compuesta (derivada del backend): muestra "COMPUESTO" en lugar de horario/días/modalidad. */
  readonly compuesto: boolean;
  readonly impuestos_ids: number[];
  /** Montos por tipo de impuesto para el desglose en el tfoot. Calculados en el frontend. */
  readonly impuestos_totales: readonly ImpuestoLinea[];
  /**
   * Horas de cobertura de la línea (derivadas del backend o del tarifador).
   * `horas = horas_diurnas + horas_nocturnas`. No editables por UI.
   */
  readonly horas: number | null;
  readonly horas_diurnas: number | null;
  readonly horas_nocturnas: number | null;
  /**
   * Horas ya programadas de la línea (derivadas del backend). Un valor > 0 indica
   * que la programación de turnos del puesto ya existe: la cobertura queda
   * bloqueada. No editables por UI.
   */
  readonly horas_programadas: number | null;
  readonly horas_diurnas_programadas: number | null;
  readonly horas_nocturnas_programadas: number | null;
  /** Precio mínimo regulado de la cobertura (del tarifador). No editable por UI. */
  readonly precio_minimo: number | null;
  /** Referencia a la línea afectada en otro documento. Derivada del backend; no editable. */
  readonly documento_detalle_afectado: number | null;
}
