/**
 * Ciclo de vida de la **programación de nómina** y qué se puede hacer en cada
 * etapa. Módulo **puro**: sin Angular, sin HTTP, testeado en
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
 */
import type { Programacion } from './programacion.model';

/**
 * Etapa del ciclo. Derivada de las dos banderas del backend, nunca almacenada:
 * un estado calculado no puede desincronizarse de su fuente.
 *
 * - `borrador`: se arma. Se edita la cabecera, se cargan y ajustan renglones.
 * - `generada`: ya existen las nóminas. La cabecera y los renglones se congelan.
 * - `aprobada`: las nóminas están aprobadas (contabilizadas).
 */
export type EstadoProgramacion = 'borrador' | 'generada' | 'aprobada';

/**
 * Datos mínimos para decidir: las dos banderas de estado y cuántos renglones hay
 * cargados. `Programacion` los cumple, y un test o un caller parcial también,
 * sin tener que fabricar los 30 campos.
 */
export interface ContextoProgramacion {
  readonly estado_generado: boolean;
  readonly estado_aprobado: boolean;
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

/** Deriva la etapa del ciclo a partir de las banderas del backend. */
export function estadoDe(ctx: ContextoProgramacion): EstadoProgramacion {
  // `aprobado` manda: una programación aprobada está siempre generada, y si el
  // backend devolviera la combinación imposible (aprobada sin generar) tratarla
  // como aprobada es lo conservador — bloquea más, no menos.
  if (ctx.estado_aprobado) return 'aprobada';
  return ctx.estado_generado ? 'generada' : 'borrador';
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

/** ¿La programación ya no admite cambios en su contenido? */
export function estaCongelada(ctx: ContextoProgramacion): boolean {
  return estadoDe(ctx) !== 'borrador';
}

/** Clave i18n del badge de la etapa (`entities.programacion.estados.*`). */
export function claveEstado(programacion: Programacion): EstadoProgramacion {
  return estadoDe(programacion);
}
