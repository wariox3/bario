/**
 * Qué se puede hacer con una **liquidación** en cada etapa de su ciclo. Módulo
 * **puro**: sin Angular, sin HTTP, testeado en `liquidacion.estado.spec.ts`.
 *
 * Misma disciplina que los otros dos procesos de humano, y por el mismo motivo:
 * generar liquida lo que se le paga a un empleado al cerrar su contrato,
 * desgenerar lo borra y aprobar lo cierra.
 *
 * La etapa en sí (`estadoDe`) vive en `../shared/proceso.estado`; lo que cambia
 * entre procesos es esta tabla.
 */
import { estadoDe, type ContextoProceso } from '../shared/proceso.estado';

/**
 * Contexto de decisión: solo las dos banderas de estado.
 *
 * A diferencia de la programación y el aporte, acá **no hace falta contar
 * nada**: una liquidación se genera con o sin adicionales cargados, porque las
 * prestaciones ya las trae calculadas.
 */
export type ContextoLiquidacion = ContextoProceso;

/** Lo que la UI puede ofrecer en la etapa actual. Una capacidad por acción. */
export interface CapacidadesLiquidacion {
  /** Liquidar: calcula prestaciones y totales. */
  readonly puedeGenerar: boolean;
  /**
   * Recalcular sobre el borrador, sin pasar por generar.
   *
   * Es exclusiva de este proceso: sirve cuando cambian los datos de origen
   * (salario, fechas de último pago) y hay que rehacer el cálculo antes de
   * liquidar en firme.
   */
  readonly puedeReliquidar: boolean;
  /** Cargar y quitar adiciones y deducciones. */
  readonly puedeGestionarAdicionales: boolean;
  /** Revertir la liquidación. */
  readonly puedeDesgenerar: boolean;
  /** Aprobar (cerrar) la liquidación generada. */
  readonly puedeAprobar: boolean;
  /** Revertir la aprobación. */
  readonly puedeDesaprobar: boolean;
  /** Eliminar la liquidación completa. */
  readonly puedeEliminar: boolean;
}

/**
 * Traduce la etapa a capacidades concretas.
 *
 * Reglas, tomadas de los `[disabled]` del ERP anterior:
 *
 * | Acción        | borrador | generada | aprobada |
 * | ------------- | -------- | -------- | -------- |
 * | Generar       | sí       | no       | no       |
 * | Reliquidar    | sí       | no       | no       |
 * | Adicionales   | sí       | no       | no       |
 * | Desgenerar    | no       | sí       | no       |
 * | Aprobar       | no       | sí       | no       |
 * | Desaprobar    | no       | no       | sí       |
 * | Eliminar      | sí       | no       | no       |
 *
 * **Imprimir no es una capacidad**: está disponible en las tres etapas, así que
 * declararla solo agregaría una constante en `true`.
 *
 * Los **adicionales se congelan al generar**, y eso es lo correcto: cambiarlos
 * después movería el total sin rehacer el cálculo.
 *
 * Nota sobre **desgenerar**: el legacy lo pide generada y **no** aprobada, igual
 * que en los otros dos procesos. Para revertir una liquidación aprobada hay que
 * desaprobarla primero.
 */
export function capacidadesDe(ctx: ContextoLiquidacion): CapacidadesLiquidacion {
  const estado = estadoDe(ctx);
  const esBorrador = estado === 'borrador';
  const esGenerada = estado === 'generada';
  const esAprobada = estado === 'aprobada';

  return {
    puedeGenerar: esBorrador,
    puedeReliquidar: esBorrador,
    puedeGestionarAdicionales: esBorrador,
    puedeDesgenerar: esGenerada,
    puedeAprobar: esGenerada,
    puedeDesaprobar: esAprobada,
    puedeEliminar: esBorrador,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_VACIAS: CapacidadesLiquidacion = capacidadesDe({
  estado_generado: false,
  estado_aprobado: true,
});
