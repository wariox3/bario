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
  /**
   * Corrección **contable** (dropdown Opciones): sede y datos contables de las
   * líneas, sin desaprobar. Que el documento la ofrezca lo decide su config
   * (`capabilities.canCorregir`); esto dice solo si su estado la permite.
   */
  readonly puedeCorregir: boolean;
  /**
   * Corrección **DIAN** (dropdown Electrónico): número, resolución y fechas de
   * la cabecera. Solo la ofrecen los documentos con config `electronico`.
   */
  readonly puedeCorregirElectronico: boolean;
  /**
   * Emitir a la DIAN (dropdown Electrónico). Solo un documento aprobado que la
   * DIAN todavía no aceptó: uno que ya es electrónico tiene su CUE y volver a
   * enviarlo no es idempotente.
   */
  readonly puedeEmitirElectronico: boolean;
}

/**
 * Traduce las banderas a capacidades concretas.
 *
 * | Acción     | sin aprobar | aprobado | contabilizado | enviado a DIAN | anulado |
 * | ---------- | ----------- | -------- | ------------- | -------------- | ------- |
 * | Aprobar    | sí          | no       | no            | no             | no      |
 * | Desaprobar | no          | sí       | no            | sí             | no      |
 * | Anular     | no          | sí       | sí            | no             | no      |
 * | Corregir   | no          | sí       | no            | sí             | no      |
 * | Corr. DIAN | no          | sí       | no            | no             | no      |
 * | Emitir     | no          | sí       | sí            | ver abajo      | no      |
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
 * - **Las dos correcciones exigen no contabilizado.** El asiento ya tomó los
 *   datos —la sede y las líneas, o la fecha y el número—: se descontabiliza,
 *   se corrige y se vuelve a contabilizar.
 * - **La contable no mira la DIAN; la DIAN, sí.** Sede y líneas no viajan en
 *   lo emitido, así que se corrigen aunque el documento ya haya salido. Número,
 *   resolución y fechas sí: una vez en camino o aceptado, cambiarlos lo
 *   dejaría distinto de lo que recibió la DIAN. Antes de eso se corrige haya
 *   fallado o no la emisión.
 * - **Emitir se apaga en cuanto el documento es electrónico.** Con
 *   `estado_electronico` (o ya notificado) la DIAN lo aceptó: no hay nada más
 *   que enviar. `enviado` a secas **no** lo apaga, para poder reintentar un
 *   envío que la DIAN rechazó. Es el mismo criterio de la utilidad de envío
 *   masivo, que filtra `estado_electronico = false`.
 * - **Todo pasa por aprobar.** Sin aprobación no hay nada que revertir ni anular.
 *
 * Recibe el `DocumentoEstados` de `@reddoc/core` tal cual, con sus banderas
 * opcionales: una bandera ausente es "no", que es lo conservador —apaga la
 * acción de menos, nunca de más—. Así cualquier read de documento sirve de
 * entrada sin normalizar nada antes.
 */
export function capacidadesDocumento(estados: DocumentoEstados): CapacidadesDocumento {
  if (estados.estado_anulado) {
    return {
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
      puedeCorregir: false,
      puedeCorregirElectronico: false,
      puedeEmitirElectronico: false,
    };
  }

  const aprobado = estados.estado_aprobado ?? false;
  const corregible = aprobado && !estados.estado_contabilizado;

  return {
    puedeAprobar: !aprobado,
    puedeDesaprobar: aprobado && !estados.estado_contabilizado,
    puedeAnular: aprobado && !estados.estado_electronico_enviado,
    puedeCorregir: corregible,
    puedeCorregirElectronico: corregible && !enviadoDian(estados),
    puedeEmitirElectronico:
      aprobado && !estados.estado_electronico && !estados.estado_electronico_notificado,
  };
}

/** Capacidades con todo apagado: estado inicial mientras la cabecera carga. */
export const CAPACIDADES_DOCUMENTO_VACIAS: CapacidadesDocumento = capacidadesDocumento({
  estado_aprobado: false,
  estado_anulado: true,
});

/**
 * ¿El documento ya salió hacia la DIAN? Cualquiera de las tres banderas lo dice:
 * en camino (`enviado`), emitido (`electronico`) o notificado al cliente.
 */
function enviadoDian(estados: DocumentoEstados): boolean {
  return (
    !!estados.estado_electronico_enviado ||
    !!estados.estado_electronico ||
    !!estados.estado_electronico_notificado
  );
}
