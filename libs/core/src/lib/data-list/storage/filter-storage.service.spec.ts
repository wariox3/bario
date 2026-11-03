import { TestBed } from '@angular/core/testing';
import { TenantService } from '../../tenant/tenant.service';
import type { FilterCondition } from '../data/list-query.types';
import { FilterStorageService } from './filter-storage.service';

const KEY = 'contratos:filters:v1';
const filtros: readonly FilterCondition[] = [{ field: 'estado', operator: 'eq', value: 'activo' }];

describe('FilterStorageService', () => {
  let storage: FilterStorageService;
  let tenant: TenantService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    storage = TestBed.inject(FilterStorageService);
    tenant = TestBed.inject(TenantService);
  });

  it('guarda los filtros bajo la clave del tenant activo', () => {
    tenant.setSlug('acme');
    storage.write(KEY, filtros);

    expect(localStorage.getItem(`acme:${KEY}`)).toBe(JSON.stringify(filtros));
    expect(storage.read(KEY)).toEqual(filtros);
  });

  it('los filtros de un contenedor no aparecen en otro', () => {
    tenant.setSlug('acme');
    storage.write(KEY, filtros);

    tenant.setSlug('globex');
    expect(storage.read(KEY)).toEqual([]);

    tenant.setSlug('acme');
    expect(storage.read(KEY)).toEqual(filtros);
  });

  it('clear solo borra los del tenant activo', () => {
    tenant.setSlug('acme');
    storage.write(KEY, filtros);
    tenant.setSlug('globex');
    storage.write(KEY, filtros);

    storage.clear(KEY);

    expect(storage.read(KEY)).toEqual([]);
    tenant.setSlug('acme');
    expect(storage.read(KEY)).toEqual(filtros);
  });

  it('sin tenant activo no lee ni escribe', () => {
    storage.write(KEY, filtros);

    expect(localStorage.length).toBe(0);
    expect(storage.read(KEY)).toEqual([]);
  });

  it('descarta la clave vieja sin tenant al leer', () => {
    localStorage.setItem(KEY, JSON.stringify(filtros));
    tenant.setSlug('acme');

    expect(storage.read(KEY)).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('descarta un JSON corrupto', () => {
    tenant.setSlug('acme');
    localStorage.setItem(`acme:${KEY}`, '{no-json');

    expect(storage.read(KEY)).toEqual([]);
    expect(localStorage.getItem(`acme:${KEY}`)).toBeNull();
  });
});
