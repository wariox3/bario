/**
 * Qué se puede hacer con una **programación de nómina** en cada etapa de su
 * ciclo. Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `programacion.estado.spec.ts`.
 *
 * Es la pieza delicada del feature. Generar fabrica documentos de nómina reales,
 * desgenerar los borra y aprobar los contabiliza: un botón habilitado de más
 * tiene consecuencias contables. Por eso la regla vive **acá y solo acá**, y la
 * UI se limita a leer capacidades — ninguna plantilla combina banderas a mano.
 *
 * El ERP anterior repartía la lógica en `[disabled]` compuestos por toda la
 * plantilla (`!programacion.estado_generado || programacion.estado_aprobado`,
 * etc.), imposible de auditar de un vistazo.
 *
 * La etapa en sí (`estadoDe`) es común a todos los procesos de humano y vive en
 * `../shared/proceso.estado`.
 */
import { estadoDe, type ContextoProceso } from '../shared/proceso.estado';

/**
 * Contexto de decisión: las banderas de estado más cuántos renglones hay
 * cargados. `Programacion` lo cumple, y un test o un caller parcial también.
 */
export interface ContextoProgramacion extends ContextoProceso {
  /**
   * Renglones cargados. Generar sin contratos no tiene sentido (el legacy lo
   * bloqueaba con `!arrProgramacionDetalle.length`), así que la capacidad lo
   * exige. Omitirlo equivale a "no sé todavía" → se trata como 0.
   */
  readonly renglones?: number;
}

/** Lo que la UI puede ofrecer en la etapa actual. Una capacidad por acción. */
export interface CapacidadesProgramacion {
  /** Editar la cabecera (fechas, tipo de pago, grupo, banderas). */
  readonly puedeEditarCabecera: boolean;
  /** Traer los contratos del grupo como renglones. */
  readonly puedeCargarContratos: boolean;
  /** Ajustar un renglón (horas, días de transporte, banderas del empleado). */
  readonly puedeEditarRenglon: boolean;
  /** Quitar renglones de la programación. */
  readonly puedeEliminarRenglon: boolean;
  /** Gestionar los conceptos adicionales del periodo. */
  readonly puedeGestionarAdicionales: boolean;
  /** Importar horas por Excel. */
  readonly puedeImportarHoras: boolean;
  /** Liquidar: crea los documentos de nómina. */
  readonly puedeGenerar: boolean;
  /** Revertir la liquidación: borra los documentos de nómina. */
  readonly puedeDesgenerar: boolean;
  /** Aprobar (contabilizar) las nóminas generadas. */
  readonly puedeAprobar: boolean;
  /** Revertir la aprobación. */
  readonly puedeDesaprobar: boolean;
  /** Notificar a los empleados. */
  readonly puedeNotificar: boolean;
  /** Imprimir las nóminas generadas. */
  readonly puedeImprimirNominas: boolean;
  /** Eliminar la programación completa. */
  readonly puedeEliminar: boolean;
}

/**
 * Traduce la etapa a capacidades concretas.
 *
 * Reglas, tomadas de los `[disabled]` del ERP anterior:
 *
 * | Acción              | borrador | generada | aprobada |
 * | ------------------- | -------- | -------- | -------- |
 * | Editar cabecera     | sí       | no       | no       |
 * | Cargar contratos    | sí       | no       | no       |
 * | Editar renglón      | sí       | no       | no       |
 * | Eliminar renglón    | sí       | no       | no       |
 * | Adicionales         | sí       | no       | no       |
 * | Importar horas      | sí¹      | no       | no       |
 * | Generar             | sí¹      | no       | no       |
 * | Desgenerar          | no       | sí       | no       |
 * | Aprobar             | no       | sí       | no       |
 * | Desaprobar          | no       | no       | sí       |
 * | Notificar           | no       | no       | sí       |
 * | Imprimir nóminas    | no       | sí       | sí       |
 * | Eliminar            | sí       | no       | no       |
 *
 * ¹ Además exige renglones cargados: generar o importar horas sin contratos no
 * tiene nada sobre lo que operar.
 *
 * Nota sobre **desgenerar**: el legacy lo pide generada y **no** aprobada. Para
 * revertir una programación aprobada hay que desaprobarla primero. Se conserva esa
 * secuencia: es la que protege las nóminas ya contabilizadas.
 */
export function capacidadesDe(ctx: ContextoProgramacion): CapacidadesProgramacion {
  const estado = estadoDe(ctx);
  const esBorrador = estado === 'borrador';
  const esGenerada = estado === 'generada';
  const esAprobada = estado === 'aprobada';
  const tieneRenglones = (ctx.renglones ?? 0) > 0;

  return {
    puedeEditarCabecera: esBorrador,
    puedeCargarContratos: esBorrador,
    puedeEditarRenglon: esBorrador,
    puedeEliminarRenglon: esBorrador,
    puedeGestionarAdicionales: esBorrador,
    puedeImportarHoras: esBorrador && tieneRenglones,
    puedeGenerar: esBorrador && tieneRenglones,
    puedeDesgenerar: esGenerada,
    puedeAprobar: esGenerada,
    puedeDesaprobar: esAprobada,
    puedeNotificar: esAprobada,
    puedeImprimirNominas: esGenerada || esAprobada,
    puedeEliminar: esBorrador,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_VACIAS: CapacidadesProgramacion = capacidadesDe({
  estado_generado: false,
  estado_aprobado: true,
});
