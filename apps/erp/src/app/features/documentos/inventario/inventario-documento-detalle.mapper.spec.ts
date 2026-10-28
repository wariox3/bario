import {
  inventarioDetalleToFormValue,
  inventarioDetalleToPayload,
  lineTotal,
  resumenInventario,
} from './inventario-documento-detalle.mapper';
import type { InventarioDetalleFormRawValue } from './inventario-documento-detalle.types';

function linea(
  cantidad: number | null,
  precio: number | null,
  extra: Partial<InventarioDetalleFormRawValue> = {},
): InventarioDetalleFormRawValue {
  return {
    id: null,
    item: { id: 10, nombre: 'Tornillo', precio: precio ?? 0 },
    almacen: { id: 2, nombre: 'Principal' },
    operacion_inventario: 1,
    cantidad,
    precio,
    ...extra,
  };
}

describe('lineTotal', () => {
  it('valoriza cantidad × precio', () => {
    expect(lineTotal({ cantidad: 3, precio: 19.99 })).toBe(59.97);
  });

  it('redondea a centavos, el medio centavo hacia arriba', () => {
    expect(lineTotal({ cantidad: 1, precio: 1.005 })).toBe(1.01);
  });

  it('acepta cantidades fraccionadas', () => {
    expect(lineTotal({ cantidad: 2.5, precio: 1000 })).toBe(2500);
  });

  it('sin cantidad o sin precio la línea vale 0', () => {
    expect(lineTotal({ cantidad: null, precio: 100 })).toBe(0);
    expect(lineTotal({ cantidad: 5, precio: null })).toBe(0);
  });
});

describe('resumenInventario', () => {
  it('suma unidades y valorización de todas las líneas', () => {
    expect(resumenInventario([linea(3, 19.99), linea(2, 0.1)])).toEqual({
      cantidad: 5,
      subtotal: 60.17,
      total: 60.17,
    });
  });

  it('sin impuestos ni descuento: subtotal y total coinciden', () => {
    const resumen = resumenInventario([linea(7, 1234.56)]);

    expect(resumen.total).toBe(resumen.subtotal);
  });

  it('tres líneas de 0,1 suman 0,3 exacto, sin residuo de coma flotante', () => {
    expect(resumenInventario([linea(1, 0.1), linea(1, 0.1), linea(1, 0.1)]).total).toBe(0.3);
  });

  it('una línea sin cantidad no suma unidades ni valor', () => {
    expect(resumenInventario([linea(null, 500), linea(2, 10)])).toEqual({
      cantidad: 2,
      subtotal: 20,
      total: 20,
    });
  });

  it('sin líneas todo queda en 0', () => {
    expect(resumenInventario([])).toEqual({ cantidad: 0, subtotal: 0, total: 0 });
  });
});

describe('inventarioDetalleToPayload', () => {
  it('manda la línea como registro de ítem con precio y total a 2 decimales', () => {
    expect(inventarioDetalleToPayload(linea(3, 19.99))).toEqual({
      tipo_registro: 'I',
      item: 10,
      almacen: 2,
      cantidad: 3,
      precio: '19.99',
      total: '59.97',
    });
  });

  it('en entrada y salida no manda el sentido: lo deriva el backend del tipo', () => {
    expect(
      inventarioDetalleToPayload(linea(1, 1, { operacion_inventario: -1 })),
    ).not.toHaveProperty('operacion_inventario');
  });

  it('en el traslado sí manda el sentido del movimiento', () => {
    const payload = inventarioDetalleToPayload(linea(1, 1, { operacion_inventario: -1 }), true);

    expect(payload.operacion_inventario).toBe(-1);
  });

  it('sin ítem, almacén ni precio manda nulos y ceros', () => {
    expect(
      inventarioDetalleToPayload(linea(null, null, { item: null, almacen: null })),
    ).toMatchObject({ item: null, almacen: null, cantidad: null, precio: '0.00', total: '0.00' });
  });
});

describe('inventarioDetalleToFormValue', () => {
  it('convierte los decimales del backend a números y arma las opciones', () => {
    const form = inventarioDetalleToFormValue({
      id: 8,
      item: 10,
      item_nombre: 'Tornillo',
      almacen: 2,
      almacen_nombre: 'Principal',
      operacion_inventario: -1,
      cantidad: '4.000000',
      precio: '1250.500000',
    });

    expect(form).toEqual({
      id: 8,
      item: { id: 10, nombre: 'Tornillo', precio: 1250.5 },
      almacen: { id: 2, nombre: 'Principal' },
      operacion_inventario: -1,
      cantidad: 4,
      precio: 1250.5,
    });
  });

  it('cualquier sentido distinto de -1 cae a 1 (suma)', () => {
    for (const operacion of [1, 0, null, undefined]) {
      const form = inventarioDetalleToFormValue({
        id: 1,
        item: 10,
        operacion_inventario: operacion,
        cantidad: '1',
        precio: '1',
      });
      expect(form.operacion_inventario).toBe(1);
    }
  });

  it('sin precio ni cantidad: precio 0 y cantidad vacía', () => {
    const form = inventarioDetalleToFormValue({ id: 1, item: null, cantidad: null, precio: null });

    expect(form.precio).toBe(0);
    expect(form.cantidad).toBeNull();
    expect(form.item).toBeNull();
  });

  it('ida y vuelta: lo que llega del backend vuelve con el mismo total', () => {
    const form = inventarioDetalleToFormValue({
      id: 1,
      item: 10,
      almacen: 2,
      cantidad: '3.000000',
      precio: '19.990000',
    });

    expect(inventarioDetalleToPayload(form)).toMatchObject({ precio: '19.99', total: '59.97' });
  });
});
