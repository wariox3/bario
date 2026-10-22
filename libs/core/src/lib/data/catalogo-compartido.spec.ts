import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { catalogoCompartido } from './catalogo-compartido';
import { ErpSelectDataService, type ErpSelectOption } from './erp-select-data.service';

const ALMACENES: ErpSelectOption[] = [
  { id: 1, nombre: 'General' },
  { id: 2, nombre: 'Bodega' },
];

describe('catalogoCompartido', () => {
  let fetchAllOptions: jest.Mock;

  beforeEach(() => {
    fetchAllOptions = jest.fn(() => of(ALMACENES));
    TestBed.configureTestingModule({
      providers: [{ provide: ErpSelectDataService, useValue: { fetchAllOptions } }],
    });
  });

  it('consulta una sola vez y expone el catálogo', () => {
    const catalogo = TestBed.runInInjectionContext(() =>
      catalogoCompartido('/inventario/almacen/seleccionar/', { params: { activo: 'True' } }),
    );
    expect(catalogo()).toEqual([]);

    TestBed.tick();
    TestBed.tick();

    expect(fetchAllOptions).toHaveBeenCalledTimes(1);
    expect(fetchAllOptions).toHaveBeenCalledWith('/inventario/almacen/seleccionar/', {
      activo: 'True',
    });
    expect(catalogo()).toEqual(ALMACENES);
  });

  it('no consulta mientras no esté activo', () => {
    const activo = signal(false);
    const catalogo = TestBed.runInInjectionContext(() =>
      catalogoCompartido('/inventario/almacen/seleccionar/', { activo }),
    );

    TestBed.tick();
    expect(fetchAllOptions).not.toHaveBeenCalled();

    activo.set(true);
    TestBed.tick();
    expect(fetchAllOptions).toHaveBeenCalledTimes(1);
    expect(catalogo()).toEqual(ALMACENES);
  });

  it('si la consulta falla queda vacío, nunca null', () => {
    fetchAllOptions.mockReturnValue(throwError(() => new Error('500')));
    const catalogo = TestBed.runInInjectionContext(() =>
      catalogoCompartido('/inventario/almacen/seleccionar/'),
    );

    TestBed.tick();
    expect(catalogo()).toEqual([]);
  });
});
