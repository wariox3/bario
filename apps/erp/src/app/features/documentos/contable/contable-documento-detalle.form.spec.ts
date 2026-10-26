import { FormArray } from '@angular/forms';
import {
  createCuentaDetalleGroup,
  propagarContactoALineas,
  type CuentaDetalleGroup,
} from './contable-documento-detalle.form';

const CUENTA = { id: 7, nombre: '1105 - Caja' };
const COLORMAX = { id: 1, nombre: 'COLORMAX PINTURAS S.A.S.' };
const CONSTRUMAS = { id: 2, nombre: 'CONSTRUMÁS LTDA' };

/** Línea de «Agregar documento»: enlazada al documento que cruza, con su tercero. */
function enlazada(): CuentaDetalleGroup {
  return createCuentaDetalleGroup({
    cuenta: CUENTA,
    naturaleza: 'C',
    valor: 16065,
    contacto: COLORMAX,
    documento_afectado: 50,
  });
}

/** Línea de «Agregar cuenta»: nace con el contacto de la cabecera. */
function manual(id: number | null = null): CuentaDetalleGroup {
  return createCuentaDetalleGroup({ id, cuenta: CUENTA, valor: 100, contacto: COLORMAX });
}

describe('createCuentaDetalleGroup', () => {
  it('bloquea el contacto de una línea enlazada sin perder su valor', () => {
    const group = enlazada();

    expect(group.controls.contacto.disabled).toBe(true);
    expect(group.getRawValue().contacto).toEqual(COLORMAX);
  });

  it('deja editable el contacto de una línea manual', () => {
    expect(manual().controls.contacto.enabled).toBe(true);
  });
});

describe('base exigida por la cuenta', () => {
  const RETENCION = { id: 30, nombre: '236540 - Compras', exige_base: true };

  it('marca la base en cero cuando la cuenta elegida la exige', () => {
    const group = manual();
    group.controls.cuenta.setValue(RETENCION);

    expect(group.controls.base.hasError('baseExigida')).toBe(true);
    expect(group.invalid).toBe(true);
  });

  it('acepta la línea en cuanto la base es mayor a cero', () => {
    const group = createCuentaDetalleGroup({ cuenta: RETENCION, valor: 25000, base: 1000000 });

    expect(group.controls.base.valid).toBe(true);
  });

  it('suelta el error al cambiar a una cuenta que no exige base', () => {
    const group = manual();
    group.controls.cuenta.setValue(RETENCION);
    group.controls.cuenta.setValue(CUENTA);

    expect(group.controls.base.valid).toBe(true);
  });
});

describe('propagarContactoALineas', () => {
  it('cambia solo las líneas manuales sin guardar', () => {
    const doc = enlazada();
    const nueva = manual();
    const guardada = manual(9);
    const detalles = new FormArray<CuentaDetalleGroup>([doc, nueva, guardada]);

    propagarContactoALineas(detalles, CONSTRUMAS);

    expect(doc.getRawValue().contacto).toEqual(COLORMAX);
    expect(nueva.controls.contacto.value).toEqual(CONSTRUMAS);
    expect(guardada.controls.contacto.value).toEqual(COLORMAX);
  });
});
