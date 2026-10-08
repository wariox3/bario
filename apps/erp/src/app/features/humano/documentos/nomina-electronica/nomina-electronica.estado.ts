/**
 * Qué se puede hacer con una **nómina electrónica** según sus banderas de
 * estado. Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `nomina-electronica.estado.spec.ts`.
 *
 * El eje de aprobación —aprobar, desaprobar, anular— es el de cualquier
 * documento y vive en `@erp/core/module-config`. Este archivo existe solo por lo
 * que la nómina electrónica agrega encima: **emitir a la DIAN**. Por eso
 * compone sobre la base en vez de reescribirla; si mañana cambia la regla de
 * anular, cambia en un sitio y este documento la hereda.
 */
import { capacidadesDocumento, type CapacidadesDocumento } from '@erp/core/module-config';
import type { DocumentoEstados } from '@reddoc/core';

/** Contexto de decisión: las banderas de estado del documento. */
export type ContextoNominaElectronica = DocumentoEstados;

/** Lo que la ficha puede ofrecer: el eje de aprobación más emitir. */
export interface CapacidadesNominaElectronica extends CapacidadesDocumento {
  /** Emitir a la DIAN. */
  readonly puedeEmitir: boolean;
}

/**
 * Traduce las banderas a capacidades concretas.
 *
 * Lo propio de este documento es una sola fila:
 *
 * | Acción | sin aprobar | aprobada | emitida | anulada |
 * | ------ | ----------- | -------- | ------- | ------- |
 * | Emitir | no          | sí       | no      | no      |
 *
 * **Emitir es de un solo uso**, pero desaprobar sigue disponible después de
 * emitir. Esa asimetría es del legacy y se conserva: emitir dos veces el mismo
 * documento a la DIAN no es idempotente.
 *
 * **Imprimir no es una capacidad**: está siempre disponible, así que declararla
 * solo agregaría una constante en `true`.
 */
export function capacidadesDe(ctx: ContextoNominaElectronica): CapacidadesNominaElectronica {
  const puedeEmitir =
    !ctx.estado_anulado && (ctx.estado_aprobado ?? false) && !ctx.estado_electronico_enviado;

  return { ...capacidadesDocumento(ctx), puedeEmitir };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_VACIAS: CapacidadesNominaElectronica = capacidadesDe({
  estado_aprobado: false,
  estado_anulado: true,
});
