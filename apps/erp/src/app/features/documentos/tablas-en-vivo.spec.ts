import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import type { ToastService } from '@reddoc/core';
import {
  guardarTablasEnSerie,
  pestanaConPrimerError,
  registrarPagosDeAlta,
  type TablaEnVivo,
} from './tablas-en-vivo';

const TEXTO = { title: 'Error', desc: 'Texto de respaldo' };

function toastFalso() {
  const mock = { success: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return { mock, service: mock as unknown as ToastService };
}

describe('guardarTablasEnSerie', () => {
  it('guarda en orden: la segunda tabla arranca recién cuando termina la primera', () => {
    const primera$ = new Subject<void>();
    const primera: TablaEnVivo = { saveAll: () => primera$ };
    const segunda = { saveAll: jest.fn(() => of(undefined)) };
    const { service } = toastFalso();
    let completo = false;

    guardarTablasEnSerie(
      [
        { tabla: primera, errorAlGuardar: TEXTO },
        { tabla: segunda, errorAlGuardar: TEXTO },
      ],
      service,
    ).subscribe({ complete: () => (completo = true) });

    expect(segunda.saveAll).not.toHaveBeenCalled();
    primera$.complete();
    expect(segunda.saveAll).toHaveBeenCalledTimes(1);
    expect(completo).toBe(true);
  });

  it('salta la tabla que no aplica (nota débito sin pagos)', () => {
    const tabla = { saveAll: jest.fn(() => of(undefined)) };
    const { service } = toastFalso();
    let completo = false;

    guardarTablasEnSerie(
      [
        { tabla, errorAlGuardar: TEXTO },
        { tabla: undefined, errorAlGuardar: TEXTO },
      ],
      service,
    ).subscribe({ complete: () => (completo = true) });

    expect(completo).toBe(true);
  });

  it('si una tabla falla avisa, emite el error y no toca las siguientes', () => {
    const falla: TablaEnVivo = { saveAll: () => throwError(() => new Error('boom')) };
    const siguiente = { saveAll: jest.fn(() => of(undefined)) };
    const { mock, service } = toastFalso();
    let error: unknown;

    guardarTablasEnSerie(
      [
        { tabla: falla, errorAlGuardar: TEXTO },
        { tabla: siguiente, errorAlGuardar: TEXTO },
      ],
      service,
    ).subscribe({ error: (e: unknown) => (error = e) });

    expect(error).toBeInstanceOf(Error);
    expect(mock.error).toHaveBeenCalledWith('Error', 'Texto de respaldo');
    expect(siguiente.saveAll).not.toHaveBeenCalled();
  });
});

describe('registrarPagosDeAlta', () => {
  it('sin tabla o sin pagos completa sin pedir nada', () => {
    const { service } = toastFalso();
    const vacia = { rowCount: () => 0, saveAll: jest.fn(() => of(undefined)) };
    let completos = 0;

    registrarPagosDeAlta(undefined, 1, service, TEXTO).subscribe({ complete: () => completos++ });
    registrarPagosDeAlta(vacia, 1, service, TEXTO).subscribe({ complete: () => completos++ });

    expect(completos).toBe(2);
    expect(vacia.saveAll).not.toHaveBeenCalled();
  });

  it('registra contra el documento recién creado', () => {
    const { service } = toastFalso();
    const pagos = { rowCount: () => 2, saveAll: jest.fn(() => of(undefined)) };

    registrarPagosDeAlta(pagos, 99, service, TEXTO).subscribe();

    expect(pagos.saveAll).toHaveBeenCalledWith(99);
  });

  it('si un pago falla avisa y completa igual: el documento ya existe', () => {
    const { mock, service } = toastFalso();
    const pagos = { rowCount: () => 1, saveAll: () => throwError(() => new Error('boom')) };
    let completo = false;
    let error = false;

    registrarPagosDeAlta(pagos, 99, service, TEXTO).subscribe({
      complete: () => (completo = true),
      error: () => (error = true),
    });

    expect(completo).toBe(true);
    expect(error).toBe(false);
    expect(mock.warn).toHaveBeenCalledWith('Error', 'Texto de respaldo');
  });
});

describe('pestanaConPrimerError', () => {
  const PESTANAS = { detalles: 'detalles', comentario: 'informacion' } as const;

  function form(valores: { contacto: string | null; item: string | null; comentario: string }) {
    return new FormGroup({
      contacto: new FormControl(valores.contacto, Validators.required),
      detalles: new FormArray([
        new FormGroup({ item: new FormControl(valores.item, Validators.required) }),
      ]),
      comentario: new FormControl(valores.comentario, Validators.maxLength(3)),
    });
  }

  it('con un error en la cabecera no cambia de pestaña', () => {
    expect(
      pestanaConPrimerError(form({ contacto: null, item: null, comentario: '' }), PESTANAS),
    ).toBeNull();
  });

  it('con la cabecera completa abre la pestaña del primer control inválido', () => {
    expect(
      pestanaConPrimerError(form({ contacto: 'ACME', item: null, comentario: 'largo' }), PESTANAS),
    ).toBe('detalles');
    expect(
      pestanaConPrimerError(form({ contacto: 'ACME', item: 'X', comentario: 'largo' }), PESTANAS),
    ).toBe('informacion');
  });

  it('con todo válido no hay pestaña que abrir', () => {
    expect(
      pestanaConPrimerError(form({ contacto: 'ACME', item: 'X', comentario: '' }), PESTANAS),
    ).toBeNull();
  });
});
