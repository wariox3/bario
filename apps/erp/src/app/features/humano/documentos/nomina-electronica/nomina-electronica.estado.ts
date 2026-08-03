/**
 * Qué se puede hacer con una **nómina electrónica** según sus banderas de
 * estado. Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `nomina-electronica.estado.spec.ts`.
 *
 * Misma disciplina que los tres procesos de humano, y por el mismo motivo: acá
 * hay cuatro acciones que se habilitan por combinaciones de tres banderas, y
 * repartir esa lógica en `[disabled]` del template es como estaba en el ERP
 * anterior — donde una de las cuatro condiciones se escribió distinta en el
 * botón y en el dropdown.
 *
 * A diferencia de los procesos, acá **no hay etapa** que derivar: no existe un
 * `estado_generado`. El documento nace aprobado o sin aprobar y de ahí se mueve.
 */

/** Contexto de decisión: las tres banderas que gobiernan las cuatro acciones. */
export interface ContextoNominaElectronica {
  readonly estado_aprobado: boolean;
  readonly estado_anulado: boolean;
  /** Ya se envió a la DIAN (esperando o con respuesta). */
  readonly estado_electronico_enviado: boolean;
}

/** Lo que la ficha puede ofrecer con las banderas actuales. Una por acción. */
export interface CapacidadesNominaElectronica {
  /** Aprobar el documento: requisito para todo lo demás. */
  readonly puedeAprobar: boolean;
  /** Revertir la aprobación. */
  readonly puedeDesaprobar: boolean;
  /** Anular: irreversible, congela el documento. */
  readonly puedeAnular: boolean;
  /** Emitir a la DIAN. */
  readonly puedeEmitir: boolean;
}

/**
 * Traduce las banderas a capacidades concretas.
 *
 * Reglas, tomadas de los `[disabled]` del ERP anterior:
 *
 * | Acción     | sin aprobar | aprobada | emitida | anulada |
 * | ---------- | ----------- | -------- | ------- | ------- |
 * | Aprobar    | sí          | no       | no      | no      |
 * | Desaprobar | no          | sí       | sí      | no      |
 * | Anular     | no          | sí       | sí      | no      |
 * | Emitir     | no          | sí       | no      | no      |
 *
 * Dos cosas que la tabla deja ver mejor que el template:
 *
 * - **Anulada gana sobre todo.** Un documento anulado queda congelado; las
 *   cuatro acciones se apagan. Es la única bandera que corta por sí sola.
 * - **Emitir es de un solo uso**, pero desaprobar y anular siguen disponibles
 *   después de emitir. Esa asimetría es del legacy y se conserva: emitir dos
 *   veces el mismo documento a la DIAN no es idempotente.
 *
 * **Imprimir no es una capacidad**: está siempre disponible, así que declararla
 * solo agregaría una constante en `true`.
 */
export function capacidadesDe(ctx: ContextoNominaElectronica): CapacidadesNominaElectronica {
  if (ctx.estado_anulado) {
    return {
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
      puedeEmitir: false,
    };
  }

  return {
    puedeAprobar: !ctx.estado_aprobado,
    puedeDesaprobar: ctx.estado_aprobado,
    puedeAnular: ctx.estado_aprobado,
    puedeEmitir: ctx.estado_aprobado && !ctx.estado_electronico_enviado,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_VACIAS: CapacidadesNominaElectronica = capacidadesDe({
  estado_aprobado: false,
  estado_anulado: true,
  estado_electronico_enviado: false,
});
