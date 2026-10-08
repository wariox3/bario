/**
 * Qué se puede hacer con un **aporte a seguridad social** en cada etapa de su
 * ciclo. Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `aporte.estado.spec.ts`.
 *
 * Misma disciplina que en la programación de nómina, y por el mismo motivo:
 * generar liquida los aportes del periodo, desgenerar borra esa liquidación y
 * aprobar la cierra. El plano que sale de acá es el que se le entrega al operador
 * de PILA, así que un botón habilitado de más se paga en plata.
 *
 * La etapa en sí (`estadoDe`) es común a los procesos de humano y vive en
 * `../shared/proceso.estado`; lo que cambia entre procesos es esta tabla.
 */
import { estadoDe, type ContextoProceso } from '../shared/proceso.estado';

/**
 * Contexto de decisión: las banderas de estado más cuántos contratos hay
 * cargados. `Aporte` lo cumple, y un test o un caller parcial también.
 */
export interface ContextoAporte extends ContextoProceso {
  /**
   * Contratos cargados en el aporte. Generar sin contratos no liquida nada (el
   * legacy lo bloqueaba con `!arrAporteDetalle.length`), así que la capacidad lo
   * exige. Omitirlo equivale a "no sé todavía" → se trata como 0.
   *
   * Admite `null` porque así lo devuelve el backend en un aporte recién creado, y
   * el read-model se pasa tal cual a `capacidadesDe`.
   */
  readonly contratos?: number | null;
}

/** Lo que la UI puede ofrecer en la etapa actual. Una capacidad por acción. */
export interface CapacidadesAporte {
  /** Editar la cabecera (sucursal, periodo, presentación, entidades). */
  readonly puedeEditarCabecera: boolean;
  /** Traer los contratos vigentes del periodo como renglones. */
  readonly puedeCargarContratos: boolean;
  /** Quitar contratos del aporte. */
  readonly puedeEliminarContrato: boolean;
  /** Liquidar: calcula las líneas y los acumulados por entidad. */
  readonly puedeGenerar: boolean;
  /** Revertir la liquidación. */
  readonly puedeDesgenerar: boolean;
  /** Aprobar (cerrar) el aporte liquidado. */
  readonly puedeAprobar: boolean;
  /** Revertir la aprobación. */
  readonly puedeDesaprobar: boolean;
  /** Descargar el plano para el operador de PILA. */
  readonly puedeGenerarPlano: boolean;
  /** Eliminar el aporte completo. */
  readonly puedeEliminar: boolean;
}

/**
 * Traduce la etapa a capacidades concretas.
 *
 * Reglas, tomadas de los `[disabled]` del ERP anterior:
 *
 * | Acción             | borrador | generada | aprobada |
 * | ------------------ | -------- | -------- | -------- |
 * | Editar cabecera    | sí       | no       | no       |
 * | Cargar contratos   | sí       | no       | no       |
 * | Eliminar contrato  | sí       | no       | no       |
 * | Generar            | sí¹      | no       | no       |
 * | Desgenerar         | no       | sí       | no       |
 * | Aprobar            | no       | sí       | no       |
 * | Desaprobar         | no       | no       | sí       |
 * | Plano operador     | no       | sí       | sí       |
 * | Eliminar           | sí       | no       | no       |
 *
 * ¹ Además exige contratos cargados.
 *
 * Dos diferencias con la programación de nómina, que comparte la forma pero no la
 * tabla: acá no hay notificar ni importar horas, y aparece el plano del operador,
 * que **solo existe una vez liquidado** — es la razón de ser del proceso.
 *
 * Nota sobre **desgenerar**: el legacy lo pide generada y **no** aprobada. Para
 * revertir un aporte aprobado hay que desaprobarlo primero; se conserva esa
 * secuencia.
 *
 * Nota sobre **eliminar**: el legacy no ofrece borrar el aporte desde la ficha.
 * Se declara la capacidad con la misma regla que el resto de lo que muta el
 * contenido (solo borrador) para que el listado tenga de dónde leerla.
 */
export function capacidadesDe(ctx: ContextoAporte): CapacidadesAporte {
  const estado = estadoDe(ctx);
  const esBorrador = estado === 'borrador';
  const esGenerada = estado === 'generada';
  const esAprobada = estado === 'aprobada';
  const tieneContratos = (ctx.contratos ?? 0) > 0;

  return {
    puedeEditarCabecera: esBorrador,
    puedeCargarContratos: esBorrador,
    puedeEliminarContrato: esBorrador,
    puedeGenerar: esBorrador && tieneContratos,
    puedeDesgenerar: esGenerada,
    puedeAprobar: esGenerada,
    puedeDesaprobar: esAprobada,
    puedeGenerarPlano: esGenerada || esAprobada,
    puedeEliminar: esBorrador,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_VACIAS: CapacidadesAporte = capacidadesDe({
  estado_generado: false,
  estado_aprobado: true,
});
