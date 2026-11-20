import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';
import { setupAsesorDesdeContacto } from './asesor-contacto';

const conAsesor = (id: number, asesorId: number, nombre: string): ErpSelectOption => ({
  id,
  nombre: `Cliente ${id}`,
  asesor_id: asesorId,
  asesor_nombre_corto: nombre,
});
const sinAsesor = (id: number): ErpSelectOption => ({
  id,
  nombre: `Cliente ${id}`,
  asesor_id: null,
  asesor_nombre_corto: null,
});

describe('setupAsesorDesdeContacto', () => {
  let contacto: FormControl<ErpSelectOption | null>;
  let asesor: FormControl<ErpSelectOption | null>;

  beforeEach(() => {
    contacto = new FormControl<ErpSelectOption | null>(null);
    asesor = new FormControl<ErpSelectOption | null>(null);
    setupAsesorDesdeContacto({ contacto, asesor, destroyRef: TestBed.inject(DestroyRef) });
  });

  it('pone el asesor del cliente con su etiqueta', () => {
    contacto.setValue(conAsesor(1, 7, 'Ana'));

    expect(asesor.value).toEqual({ id: 7, nombre: 'Ana', nombre_corto: 'Ana' });
  });

  it('pisa un asesor elegido a mano si el cliente tiene uno', () => {
    asesor.setValue({ id: 3, nombre: 'Luis' });
    contacto.setValue(conAsesor(1, 7, 'Ana'));

    expect(asesor.value?.id).toBe(7);
  });

  it('un cliente sin asesor vacía el que puso el cliente anterior', () => {
    contacto.setValue(conAsesor(1, 7, 'Ana'));
    contacto.setValue(sinAsesor(2));

    expect(asesor.value).toBeNull();
  });

  it('un cliente sin asesor respeta el elegido a mano', () => {
    asesor.setValue({ id: 3, nombre: 'Luis' });
    contacto.setValue(sinAsesor(2));

    expect(asesor.value?.id).toBe(3);
  });

  it('respeta el elegido a mano después de uno sugerido', () => {
    contacto.setValue(conAsesor(1, 7, 'Ana'));
    asesor.setValue({ id: 3, nombre: 'Luis' });
    contacto.setValue(sinAsesor(2));

    expect(asesor.value?.id).toBe(3);
  });

  it('no reacciona a la carga en edición (emitEvent: false)', () => {
    asesor.setValue({ id: 3, nombre: 'Luis' }, { emitEvent: false });
    contacto.setValue(conAsesor(1, 7, 'Ana'), { emitEvent: false });

    expect(asesor.value?.id).toBe(3);
  });
});
