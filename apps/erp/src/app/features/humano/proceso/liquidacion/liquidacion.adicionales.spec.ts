import { OPERACION, montosDe, operacionDe, valorDe } from './liquidacion.adicionales';

describe('montosDe', () => {
  it('una adición llena adicional y deja deducción en cero', () => {
    expect(montosDe(OPERACION.ADICIONA, 150000)).toEqual({ adicional: 150000, deduccion: 0 });
  });

  it('una deducción llena deducción y deja adicional en cero', () => {
    expect(montosDe(OPERACION.DEDUCE, 80000)).toEqual({ adicional: 0, deduccion: 80000 });
  });

  it('acepta el valor como string decimal', () => {
    expect(montosDe(OPERACION.ADICIONA, '1200.50').adicional).toBe(1200.5);
  });

  it('manda cero, no NaN, cuando el valor no es numérico', () => {
    // El backend recibe siempre los dos campos: uno con monto y el otro en cero.
    expect(montosDe(OPERACION.ADICIONA, null)).toEqual({ adicional: 0, deduccion: 0 });
    expect(montosDe(OPERACION.DEDUCE, 'x')).toEqual({ adicional: 0, deduccion: 0 });
  });
});

describe('operacionDe', () => {
  it('un registro con deducción reabre como deducción', () => {
    expect(operacionDe({ deduccion: 50000 })).toBe(OPERACION.DEDUCE);
  });

  it('un registro sin deducción reabre como adición', () => {
    expect(operacionDe({ deduccion: 0 })).toBe(OPERACION.ADICIONA);
    expect(operacionDe({ deduccion: null })).toBe(OPERACION.ADICIONA);
  });

  it('lee la deducción que llega como string decimal', () => {
    expect(operacionDe({ deduccion: '50000.00' })).toBe(OPERACION.DEDUCE);
  });
});

describe('valorDe', () => {
  it('devuelve el monto que aplica, sea cual sea el campo', () => {
    expect(valorDe({ adicional: 150000, deduccion: 0 })).toBe(150000);
    expect(valorDe({ adicional: 0, deduccion: 80000 })).toBe(80000);
  });

  it('con los dos en cero devuelve cero', () => {
    expect(valorDe({ adicional: null, deduccion: null })).toBe(0);
  });

  it('ida y vuelta: guardar y reabrir conserva operación y monto', () => {
    const montos = montosDe(OPERACION.DEDUCE, 80000);
    expect(operacionDe(montos)).toBe(OPERACION.DEDUCE);
    expect(valorDe(montos)).toBe(80000);
  });
});
