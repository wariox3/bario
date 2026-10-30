import { formatCop } from '@reddoc/core';
import type { Carrito, LineaCarrito } from '../carrito/carrito.model';
import type { EmpresaTirilla } from '../../configuracion/configuracion-empresa.service';
import { preCuentaHtml, type TextosPreCuenta } from './pre-cuenta';

const linea: LineaCarrito = {
  id: null,
  item: { id: 7, nombre: 'A-01 - Café <especial>', precio: 1000 },
  cantidad: 2,
  precio: 1000,
  descuento: 0,
  impuestos_ids: [10],
  impuestos_totales: [{ id: 10, nombre: 'IVA 19%', total: 380 }],
  impuestos_disponibles: [],
  detalle: null,
  almacen: null,
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
  contacto: { id: 3, nombre: 'Ferretería Ríos' },
  lineas: [linea],
};

const empresa: EmpresaTirilla = {
  nombre: 'Mi Tienda SAS',
  identificacion: '900123456-7',
  direccion: 'Calle 1 # 2-3',
  telefono: '',
  correo: '',
  textos: { superior: 'Régimen común', inferior: 'Gracias por su compra' },
};

const tx: TextosPreCuenta = {
  titulo: 'Pre-cuenta',
  aviso: 'Documento no válido como factura',
  nit: 'NIT',
  telefono: 'Tel.',
  fecha: 'Fecha',
  cliente: 'Cliente',
  subtotal: 'Subtotal',
  descuento: 'Descuento',
  total: 'Total',
};

const ahora = new Date(2026, 9, 30, 14, 5);

describe('preCuentaHtml', () => {
  const html = preCuentaHtml(venta, empresa, tx, ahora);

  it('dice que no es una factura', () => {
    expect(html).toContain('Pre-cuenta');
    expect(html).toContain('Documento no válido como factura');
  });

  it('lleva la empresa, los textos de la tirilla, la fecha y el cliente', () => {
    expect(html).toContain('Mi Tienda SAS');
    expect(html).toContain('NIT 900123456-7');
    expect(html).toContain('Régimen común');
    expect(html).toContain('Gracias por su compra');
    expect(html).toContain('30/10/2026 14:05');
    expect(html).toContain('Ferretería Ríos');
  });

  it('omite lo que la empresa no tiene', () => {
    expect(html).not.toContain('Tel.');
  });

  it('desglosa subtotal, impuestos y total', () => {
    expect(html).toContain(formatCop(2000));
    expect(html).toContain('IVA 19%');
    expect(html).toContain(formatCop(380));
    expect(html).toContain(formatCop(2380));
    expect(html).not.toContain('Descuento');
  });

  it('muestra el descuento cuando lo hay', () => {
    const conDescuento = preCuentaHtml(
      { ...venta, lineas: [{ ...linea, descuento: 10 }] },
      empresa,
      tx,
      ahora,
    );
    expect(conDescuento).toContain('Descuento');
  });

  it('no inyecta como HTML lo que escribió el usuario', () => {
    expect(html).toContain('Café &lt;especial&gt;');
    expect(html).not.toContain('<especial>');
  });

  it('sin cliente no pinta la fila', () => {
    expect(preCuentaHtml({ ...venta, contacto: null }, empresa, tx, ahora)).not.toContain(
      'Cliente',
    );
  });
});
