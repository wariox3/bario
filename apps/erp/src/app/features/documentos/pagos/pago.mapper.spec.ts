import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { PagoSinCuentaBancoError } from './pago.errors';
import { createPagoGroup } from './pago.form';
import { pagoReadToFormValue, pagoToPayload } from './pago.mapper';

const BANCO = { id: 7, nombre: 'Bancolombia' };

describe('pagoToPayload', () => {
  it('manda documento, id de la cuenta y el monto con 2 decimales', () => {
    const raw = { id: null, cuenta_banco: BANCO, pago: 50000.5, estado_anulado: false };
    expect(pagoToPayload(raw, 10)).toEqual({ documento: 10, cuenta_banco: 7, pago: '50000.50' });
  });

  it('sin cuenta de banco no arma el body: la fila debía llegar filtrada', () => {
    const raw = { id: null, cuenta_banco: null, pago: 100, estado_anulado: false };
    expect(() => pagoToPayload(raw, 10)).toThrow(PagoSinCuentaBancoError);
  });
});

describe('pagoReadToFormValue', () => {
  it('pasa el monto decimal del backend a número y conserva el estado', () => {
    expect(
      pagoReadToFormValue({
        id: 3,
        documento: 10,
        cuenta_banco: 7,
        cuenta_banco_nombre: 'Bancolombia',
        pago: '120000.000000',
        estado_anulado: true,
      }),
    ).toEqual({ id: 3, cuenta_banco: BANCO, pago: 120000, estado_anulado: true });
  });

  it('un pago sin monto se lee como cero', () => {
    const read = {
      id: 3,
      documento: 10,
      cuenta_banco: 7,
      cuenta_banco_nombre: 'X',
      estado_anulado: false,
    };
    expect(pagoReadToFormValue(read).pago).toBe(0);
  });
});

describe('createPagoGroup', () => {
  it('una fila sin cuenta o en cero es inválida', () => {
    expect(createPagoGroup({ pago: 100 }).invalid).toBe(true);
    expect(createPagoGroup({ cuenta_banco: BANCO, pago: 0 }).invalid).toBe(true);
    expect(createPagoGroup({ cuenta_banco: BANCO, pago: 100 }).valid).toBe(true);
  });

  it('un pago anulado nace deshabilitado: no invalida el form pero se sigue leyendo', () => {
    const anulado = createPagoGroup({ id: 5, cuenta_banco: BANCO, pago: 0, estado_anulado: true });
    // Un array con todas sus filas deshabilitadas queda DISABLED (ni válido ni inválido);
    // lo que importa es que no bloquee al form del documento.
    const form = new FormGroup({
      contacto: new FormControl('ACME'),
      pagos: new FormArray([anulado]),
    });
    expect(anulado.disabled).toBe(true);
    expect(form.valid).toBe(true);
    expect(form.getRawValue().pagos).toEqual([
      { id: 5, cuenta_banco: BANCO, pago: 0, estado_anulado: true },
    ]);
  });
});
