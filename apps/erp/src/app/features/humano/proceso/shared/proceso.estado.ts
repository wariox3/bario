/**
 * Ciclo de vida común a los **procesos de humano** (programación de nómina,
 * aporte a seguridad social). Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `proceso.estado.spec.ts`.
 *
 * Los dos procesos comparten exactamente esto: las mismas dos banderas del
 * backend y la misma forma de derivar la etapa. Lo que **no** comparten son las
 * capacidades — notificar e importar horas solo existen en programación, el plano
 * del operador solo en aporte — así que cada proceso escribe su propia tabla en
 * su `<proceso>.estado.ts` y la testea aparte.
 *
 * Esa división es deliberada: unificar también las capacidades obligaría a una
 * tabla llena de condicionales por proceso, que es justo lo que estos módulos
 * existen para evitar.
 */

/**
 * Etapa del ciclo. Derivada de las dos banderas del backend, nunca almacenada:
 * un estado calculado no puede desincronizarse de su fuente.
 *
 * - `borrador`: se arma. Se edita la cabecera y se cargan los renglones.
 * - `generada`: la liquidación ya existe y el contenido se congela.
 * - `aprobada`: la liquidación está aprobada (contabilizada).
 */
export type EstadoProceso = 'borrador' | 'generada' | 'aprobada';

/**
 * Datos mínimos para decidir la etapa. Los read-model de los procesos lo
 * cumplen, y un test o un caller parcial también, sin fabricar los 30 campos.
 */
export interface ContextoProceso {
  readonly estado_generado: boolean;
  readonly estado_aprobado: boolean;
}

/** Deriva la etapa del ciclo a partir de las banderas del backend. */
export function estadoDe(ctx: ContextoProceso): EstadoProceso {
  // `aprobado` manda: un proceso aprobado está siempre generado, y si el backend
  // devolviera la combinación imposible (aprobado sin generar) tratarla como
  // aprobada es lo conservador — bloquea más, no menos.
  if (ctx.estado_aprobado) return 'aprobada';
  return ctx.estado_generado ? 'generada' : 'borrador';
}
