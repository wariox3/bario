import { cuentaPropuesta, cuentasDelMedio, type CuentaCobro } from './cuentas-cobro';
import { MEDIOS_PAGO_POS } from './medios-pago';

const [efectivo, transferencia] = MEDIOS_PAGO_POS;

const caja: CuentaCobro = { id: 1, nombre: 'EFECTIVO', tipo: 3 };
const nacional: CuentaCobro = { id: 2, nombre: 'CUENTA AHORROS', tipo: 1 };
const tipo2: CuentaCobro = { id: 3, nombre: 'OTRA', tipo: 2 };
const sinTipo: CuentaCobro = { id: 4, nombre: 'SIN TIPO', tipo: null };
const todas = [caja, nacional, tipo2, sinTipo];

describe('cuentasDelMedio', () => {
  it('el efectivo entra solo a las cuentas de tipo caja', () => {
    expect(cuentasDelMedio(todas, efectivo)).toEqual([caja]);
  });

  it('el resto entra a cualquier otro tipo; sin tipo no se ofrece', () => {
    expect(cuentasDelMedio(todas, transferencia)).toEqual([nacional, tipo2]);
  });
});

describe('cuentaPropuesta', () => {
  it('con una sola, esa', () => {
    expect(cuentaPropuesta([caja], null)).toBe(caja);
    expect(cuentaPropuesta([caja], 99)).toBe(caja);
  });

  it('con varias, la recordada si sigue existiendo', () => {
    expect(cuentaPropuesta([nacional, tipo2], 3)).toBe(tipo2);
    expect(cuentaPropuesta([nacional, tipo2], 99)).toBeNull();
    expect(cuentaPropuesta([nacional, tipo2], null)).toBeNull();
  });

  it('sin cuentas, nada', () => {
    expect(cuentaPropuesta([], 1)).toBeNull();
  });
});
