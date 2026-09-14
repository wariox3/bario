import { calcularPagos } from './pago.calculo';
import type { PagoFormRawValue } from './pago.form';

const pago = (monto: number): PagoFormRawValue => ({
  cuenta_banco: { id: 1, nombre: 'Bancolombia' },
  pago: monto,
});

describe('calcularPagos', () => {
  it('sin pagos: nada recibido y todo el total pendiente', () => {
    expect(calcularPagos([], 1_190_000)).toEqual({
      recibido: 0,
      saldo: 1_190_000,
      excede: false,
    });
  });

  it('suma los pagos y descuenta el saldo', () => {
    expect(calcularPagos([pago(500_000), pago(190_000)], 1_190_000)).toEqual({
      recibido: 690_000,
      saldo: 500_000,
      excede: false,
    });
  });

  it('pago exacto: saldo en cero y no excede', () => {
    expect(calcularPagos([pago(1_190_000)], 1_190_000)).toEqual({
      recibido: 1_190_000,
      saldo: 0,
      excede: false,
    });
  });

  it('lo recibido supera el total: excede y el saldo no queda negativo', () => {
    expect(calcularPagos([pago(1_000_000), pago(300_000)], 1_190_000)).toEqual({
      recibido: 1_300_000,
      saldo: 0,
      excede: true,
    });
  });
});
