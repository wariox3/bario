import { DOCUMENT_TYPE_ID } from '@reddoc/core';
import type { Carrito, LineaCarrito } from '../carrito/carrito.model';
import { MEDIOS_PAGO_POS } from './medios-pago';
import { pagosToPayload, solicitudToPayload } from './cobro.mapper';
import type { SolicitudCobro } from './cobro.model';

const linea: LineaCarrito = {
  id: null,
  item: { id: 7, nombre: 'A-01 - Café', precio: 1000 },
  cantidad: 2,
  precio: 1000,
  descuento: 0,
  impuestos_ids: [10],
  impuestos_totales: [{ id: 10, nombre: 'IVA 19%', total: 380 }],
  impuestos_disponibles: [],
  detalle: null,
  almacen: { id: 1, nombre: 'Viejo' },
  documento_detalle_afectado: null,
  codigo: 'A-01',
  imagenUrl: null,
  disponible: 5,
  precioBase: 1000,
  precioEditado: false,
};

const venta: Carrito = {
  uuid: 'u1',
  nombre: 'Venta 1',
  contacto: { id: 3, nombre: '222 - Consumidor final' },
  lineas: [linea],
};

const solicitud: SolicitudCobro = {
  venta,
  documentoTipoId: DOCUMENT_TYPE_ID.FACTURA_POS,
  medio: MEDIOS_PAGO_POS[0],
  pagos: [{ cuentaBanco: { id: 9, nombre: 'Caja general' }, monto: 2380 }],
  almacen: { id: 2, nombre: 'Principal' },
  sede: null,
  asesor: { id: 4, nombre: 'Ana' },
  comentario: null,
};

describe('solicitudToPayload', () => {
  const payload = solicitudToPayload(
    solicitud,
    { id: 21, nombre: 'Efectivo' },
    { id: 1, nombre: 'Contado' },
    new Date(2026, 9, 14),
  );

  it('factura y vence hoy, a contado, con el método y el tipo de la caja', () => {
    expect(payload).toMatchObject({
      documento_tipo: DOCUMENT_TYPE_ID.FACTURA_POS,
      contacto: 3,
      fecha: '2026-10-14',
      fecha_vence: '2026-10-14',
      plazo_pago: 1,
      metodo_pago: 21,
      almacen: 2,
      asesor: 4,
      sede: null,
    });
  });

  it('las líneas salen del almacén de la caja al cobrar, con sus impuestos', () => {
    expect(payload.detalles).toEqual([
      expect.objectContaining({
        item: 7,
        cantidad: 2,
        precio: '1000.00',
        almacen: 2,
        impuestos_ids: [10],
      }),
    ]);
  });

  it('el comentario de la solicitud llega al documento', () => {
    const conReferencia = solicitudToPayload(
      { ...solicitud, comentario: 'Transferencia, ref. M123' },
      { id: 22, nombre: 'Transferencia' },
      { id: 1, nombre: 'Contado' },
      new Date(2026, 9, 14),
    );
    expect(conReferencia.comentario).toBe('Transferencia, ref. M123');
  });
});

describe('pagosToPayload', () => {
  it('registra cada pago contra el documento con dos decimales', () => {
    expect(pagosToPayload(55, solicitud.pagos)).toEqual([
      { documento: 55, cuenta_banco: 9, pago: '2380.00' },
    ]);
  });
});
