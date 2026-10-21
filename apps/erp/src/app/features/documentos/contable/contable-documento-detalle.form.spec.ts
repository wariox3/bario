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
