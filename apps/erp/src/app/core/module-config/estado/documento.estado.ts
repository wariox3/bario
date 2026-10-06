/**
 * Qué se puede hacer con un **documento transaccional** según sus banderas de
 * estado. Módulo **puro**: sin Angular, sin HTTP, testeado en
 * `documento.estado.spec.ts`.
 *
 * Es la tabla del eje de aprobación —aprobar, desaprobar, anular—, común a los
 * 22 documentos del ERP. Antes vivía repartida en los `[disabled]` de cada
 * ficha, igual que en el ERP anterior, y ahí se paga: de las 25 fichas del
 * legacy que ofrecen desaprobar, 23 escriben una condición y 2 escriben otra,
 * sin que se pueda saber si esa diferencia fue una decisión o un copy-paste a
 * medias. Con la regla en un solo sitio, una diferencia así solo puede existir
 * escrita como excepción.
 *
 * **Un documento no se agrega acá.** Esta tabla no distingue tipos: recibe las
 * banderas y responde. Lo que un documento concreto agrega —emitir a la DIAN en
 * la nómina electrónica, generar en el pedido de servicio— vive en su propio
 * `<documento>.estado.ts`, que **compone** sobre esta base en vez de reescribirla:
 *
 * ```ts
 * export function capacidadesDe(ctx: ContextoNominaElectronica) {
 *   return { ...capacidadesDocumento(ctx), puedeEmitir: … };
 * }
 * ```
 *
 * Los **procesos de humano** (programación, aporte, liquidación) no usan esta
 * tabla: su ciclo es otro —borrador, generada, aprobada, con generar y
 * desgenerar— y vive en `features/humano/proceso/shared/proceso.estado.ts`.
 */
import type { DocumentoEstados } from '@reddoc/core';

/**
 * Lo que la ficha puede ofrecer con las banderas actuales. Una por acción del
 * eje de aprobación.
 */
export interface CapacidadesDocumento {
  /** Aprobar el documento: requisito para todo lo demás. */
  readonly puedeAprobar: boolean;
  /** Revertir la aprobación. Deja el documento vivo y editable otra vez. */
  readonly puedeDesaprobar: boolean;
  /** Anular: irreversible, congela el documento. No es lo mismo que desaprobar. */
  readonly puedeAnular: boolean;
}

/**
 * Traduce las banderas a capacidades concretas.
 *
 * | Acción     | sin aprobar | aprobado | contabilizado | enviado a DIAN | anulado |
 * | ---------- | ----------- | -------- | ------------- | -------------- | ------- |
 * | Aprobar    | sí          | no       | no            | no             | no      |
 * | Desaprobar | no          | sí       | no            | sí             | no      |
 * | Anular     | no          | sí       | sí            | no             | no      |
 *
 * Cuatro cosas que la tabla deja ver mejor que un template:
 *
 * - **Anulado gana sobre todo.** Un documento anulado queda congelado; las tres
 *   acciones se apagan. Es la única bandera que corta por sí sola. El legacy no
 *   lo hacía en aprobar, así que ofrecía re-aprobar lo anulado.
 * - **Anular no es desaprobar.** Desaprobar devuelve el documento a borrador;
 *   anular lo cierra para siempre. Por eso desaprobar sigue disponible después
 *   de emitir y anular no.
 * - **Contabilizado bloquea desaprobar.** Revertir la aprobación de un documento
 *   ya contabilizado exigiría revertir el asiento. El legacy solo lo respetaba
 *   en remisión y factura de venta; acá vale para todos, que es la regla que las
 *   otras 23 fichas deberían haber tenido.
 * - **Todo pasa por aprobar.** Sin aprobación no hay nada que revertir ni anular.
 *
 * Recibe el `DocumentoEstados` de `@reddoc/core` tal cual, con sus banderas
 * opcionales: una bandera ausente es "no", que es lo conservador —apaga la
 * acción de menos, nunca de más—. Así cualquier read de documento sirve de
 * entrada sin normalizar nada antes.
 */
export function capacidadesDocumento(estados: DocumentoEstados): CapacidadesDocumento {
  if (estados.estado_anulado) {
    return { puedeAprobar: false, puedeDesaprobar: false, puedeAnular: false };
  }

  const aprobado = estados.estado_aprobado ?? false;

  return {
    puedeAprobar: !aprobado,
    puedeDesaprobar: aprobado && !estados.estado_contabilizado,
    puedeAnular: aprobado && !estados.estado_electronico_enviado,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_DOCUMENTO_VACIAS: CapacidadesDocumento = capacidadesDocumento({
  estado_aprobado: false,
  estado_anulado: true,
});
