import type { ResumenDocumento } from '@reddoc/core';
import {
  calcularResumenContable,
  cuentaDetalleToLineaView,
  resumenConCuentas,
} from './contable-documento-detalle.mapper';
import type { CuentaDetalleFormRawValue } from './contable-documento-detalle.types';

const ITEMS: ResumenDocumento = {
  subtotal: 100000,
  descuento: 0,
  impuestos: [{ id: 1, nombre: 'IVA 19%', total: 19000 }],
  total: 119000,
};

function cuenta(naturaleza: 'D' | 'C', valor: number): CuentaDetalleFormRawValue {
  return {
    id: null,
    cuenta: { id: 7, nombre: '2365 - Retención' },
    naturaleza,
    valor,
    contacto: null,
    centro_costo: null,
    base: 0,
    numero: null,
    detalle: null,
    documento_afectado: null,
    documento_afectado_numero: null,
    documento_afectado_tipo: null,
  };
}

describe('resumenConCuentas', () => {
  it('suma los débitos y resta los créditos al total de los ítems', () => {
    const cuentas = calcularResumenContable([cuenta('D', 5000), cuenta('C', 2500)]);

    const resumen = resumenConCuentas(ITEMS, cuentas);

    expect(resumen.total).toBe(121500);
  });

  it('no toca subtotal, descuento ni impuestos', () => {
    const resumen = resumenConCuentas(ITEMS, { debitos: 5000, creditos: 0 });

    expect(resumen.subtotal).toBe(ITEMS.subtotal);
    expect(resumen.impuestos).toBe(ITEMS.impuestos);
  });

  it('una factura solo con cuentas da débitos menos créditos', () => {
    const vacio: ResumenDocumento = { subtotal: 0, descuento: 0, impuestos: [], total: 0 };

    expect(resumenConCuentas(vacio, { debitos: 300, creditos: 100 }).total).toBe(200);
  });
});

describe('cuentaDetalleToLineaView', () => {
  it('lleva el subtotal y el neto del backend a la línea', () => {
    const view = cuentaDetalleToLineaView({
      id: 3,
      tipo_registro: 'C',
      item: null,
      cantidad: null,
      precio: '5000.00',
      subtotal: '5000.00',
      total: '5000.00',
      naturaleza: 'C',
    });

    expect(view).toMatchObject({ id: 3, naturaleza: 'C', valor: 5000, subtotal: 5000, neto: 5000 });
  });

  it('deja vacíos el subtotal y el neto cuando el backend no los manda', () => {
    const view = cuentaDetalleToLineaView({ id: 3, item: null, cantidad: null, precio: '10' });

    expect(view.subtotal).toBeNull();
    expect(view.neto).toBeNull();
  });
});
