import {
  posDocumentoToPayload,
  type ErpSelectOption,
  type PagoPayload,
  type PosDocumentoPayload,
} from '@reddoc/core';
import type { PagoCobro, SolicitudCobro } from './cobro.model';

/**
 * Solicitud de cobro → documento POS listo para `POST documento/`.
 *
 * Una venta de caja se factura y vence hoy, a contado. Todas las líneas salen
 * del almacén configurado en la caja al momento de cobrar (no del que había al
 * agregarlas), y viajan embebidas con sus impuestos.
 */
export function solicitudToPayload(
  solicitud: SolicitudCobro,
  metodoPago: ErpSelectOption,
  plazoContado: ErpSelectOption,
  hoy: Date,
): PosDocumentoPayload {
  const { venta, almacen } = solicitud;
  return posDocumentoToPayload(
    {
      contacto: venta.contacto,
      fecha: hoy,
      fecha_vence: hoy,
      plazo_pago: plazoContado,
      sede: solicitud.sede,
      almacen,
      metodo_pago: metodoPago,
      asesor: solicitud.asesor,
      orden_compra: null,
      comentario: null,
      detalles: venta.lineas.map((linea) => ({ ...linea, almacen })),
    },
    solicitud.documentoTipoId,
  );
}

/** Pagos del cobro → cuerpos de `POST documento-pago/` contra el documento creado. */
export function pagosToPayload(documentoId: number, pagos: readonly PagoCobro[]): PagoPayload[] {
  return pagos.map((p) => ({
    documento: documentoId,
    cuenta_banco: p.cuentaBanco.id,
    pago: p.monto.toFixed(2),
  }));
}
