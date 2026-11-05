import {
  posDocumentoToPayload,
  type ErpSelectOption,
  type PagoPayload,
  type PosDocumentoPayload,
} from '@reddoc/core';
import type { PagoCobro, SolicitudCobro } from './cobro.model';

/**
 * Método de pago de todo documento POS, sea cual sea el medio: va fijo, sin
 * consultar el catálogo del tenant (decisión de producto). El medio real del
 * cobro queda en la cuenta del pago.
 */
export const METODO_PAGO_POS_ID = 1;

/**
 * Solicitud de cobro → documento POS listo para `POST documento/`.
 *
 * Una venta de caja se factura y vence hoy, a contado, con el método de pago
 * fijo (`METODO_PAGO_POS_ID`). Todas las líneas salen
 * del almacén configurado en la caja al momento de cobrar (no del que había al
 * agregarlas), y viajan embebidas con sus impuestos.
 */
export function solicitudToPayload(
  solicitud: SolicitudCobro,
  plazoContado: ErpSelectOption,
  hoy: Date,
): PosDocumentoPayload {
  const { venta, almacen } = solicitud;
  const documento = posDocumentoToPayload(
    {
      contacto: venta.contacto,
      fecha: hoy,
      fecha_vence: hoy,
      plazo_pago: plazoContado,
      sede: solicitud.sede,
      almacen,
      metodo_pago: { id: METODO_PAGO_POS_ID, nombre: '' },
      asesor: solicitud.asesor,
      orden_compra: null,
      comentario: solicitud.comentario,
      detalles: venta.lineas.map((linea) => ({ ...linea, almacen })),
    },
    solicitud.documentoTipoId,
  );
  return { ...documento, soporte: solicitud.soporte };
}

/** Pagos del cobro → cuerpos de `POST documento-pago/` contra el documento creado. */
export function pagosToPayload(documentoId: number, pagos: readonly PagoCobro[]): PagoPayload[] {
  return pagos.map((p) => ({
    documento: documentoId,
    cuenta_banco: p.cuentaBanco.id,
    pago: p.monto.toFixed(2),
  }));
}
