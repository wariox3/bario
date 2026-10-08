/**
 * La **novedad** de un contrato dentro del aporte: si entró, si salió, o si su
 * terminación no cuadra con el periodo.
 *
 * Es la única validación visual del proceso. El ERP anterior la resolvía pintando
 * las celdas de fecha (`marcar-ingreso`, `marcar-error`), un color sin etiqueta
 * que solo se entiende sabiendo de antemano qué significa. Acá se convierte en un
 * dato con nombre, que además se puede leer, exportar y filtrar.
 *
 * Módulo puro, testeado en `aporte.contratos.spec.ts`.
 */
import type { AporteContrato } from './aporte.model';

export type NovedadContrato = 'ninguna' | 'ingreso' | 'retiro' | 'ingresoRetiro' | 'error';

/** Lo mínimo para decidir la novedad; `AporteContrato` lo cumple. */
export interface ContextoNovedad {
  readonly ingreso: boolean;
  readonly retiro: boolean;
  readonly error_terminacion: boolean;
}

/**
 * Deriva la novedad de un contrato.
 *
 * `error_terminacion` **gana sobre todo lo demás**: es lo único que pide una
 * corrección antes de generar, y perderlo detrás de un "ingreso" sería esconder
 * justo lo que hay que revisar.
 */
export function novedadDe(contrato: ContextoNovedad): NovedadContrato {
  if (contrato.error_terminacion) return 'error';
  if (contrato.ingreso && contrato.retiro) return 'ingresoRetiro';
  if (contrato.ingreso) return 'ingreso';
  if (contrato.retiro) return 'retiro';
  return 'ninguna';
}

/** Fila de la tabla de contratos: el read-model más su novedad ya resuelta. */
export interface AporteContratoFila extends AporteContrato {
  readonly novedad: NovedadContrato;
}

/** Agrega la novedad a cada contrato de la página. */
export function conNovedad(contratos: readonly AporteContrato[]): AporteContratoFila[] {
  return contratos.map((contrato) => ({ ...contrato, novedad: novedadDe(contrato) }));
}
