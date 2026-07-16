import type { LineaCalculo } from '@reddoc/core';
import type { DetalleFormRawValue } from './servicio-documento-detalle.types';

/** Base gravable de una línea del documento: `cantidad × precio`. */
export function lineAmount(line: Pick<DetalleFormRawValue, 'cantidad' | 'precio'>): number {
  return (line.cantidad ?? 0) * (line.precio ?? 0);
}

/** Adapta una línea del documento al contrato mínimo del kernel de cálculo. */
export function toLineaCalculo(line: DetalleFormRawValue): LineaCalculo {
  return { base: lineAmount(line), impuestos: line.impuestos_totales };
}

/**
 * `true` si la línea ya tiene programación asignada (horas programadas de
 * cualquier tipo). Su cobertura —fechas, horario, modalidad, salario y días— ya
 * se materializó en turnos, así que moverla dejaría la programación inconsistente.
 */
export function tieneHorasProgramadas(
  line: Pick<
    DetalleFormRawValue,
    'horas_programadas' | 'horas_diurnas_programadas' | 'horas_nocturnas_programadas'
  >,
): boolean {
  return (
    (line.horas_programadas ?? 0) > 0 ||
    (line.horas_diurnas_programadas ?? 0) > 0 ||
    (line.horas_nocturnas_programadas ?? 0) > 0
  );
}
