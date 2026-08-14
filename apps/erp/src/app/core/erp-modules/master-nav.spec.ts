import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import { ActiveModuleStore } from './active-module.store';
import { SinTenantActivoError, masterNav } from './master-nav';

const DICT = { modules: { venta: { name: 'Venta' }, general: { name: 'General' } } };

describe('masterNav', () => {
  let navigate: jest.Mock;

  function armar(
    opciones: { readonly slug?: string | null; readonly modulo?: string | null } = {},
  ) {
    const { slug = 'bicigengor', modulo = 'venta' } = opciones;
    navigate = jest.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: I18nService, useValue: { t: () => DICT } },
      ],
    });
    if (slug) TestBed.inject(TenantService).setSlug(slug);
    TestBed.inject(ActiveModuleStore).setActive(modulo);
    return TestBed.runInInjectionContext(() => masterNav('sedes'));
  }

  it('navega dentro del módulo por el que se entró, no donde vive el master', () => {
    armar({ modulo: 'venta' }).ir('nuevo');

    expect(navigate).toHaveBeenCalledWith(['/t', 'bicigengor', 'venta', 'sedes', 'nuevo']);
  });

  it('sigue al módulo activo cuando el mismo master se abre desde otro', () => {
    armar({ modulo: 'inventario' }).ir('editar', 7);

    expect(navigate).toHaveBeenCalledWith(['/t', 'bicigengor', 'inventario', 'sedes', 'editar', 7]);
  });

  it('cae a general cuando no hay módulo activo', () => {
    expect(armar({ modulo: null }).link()).toEqual(['/t', 'bicigengor', 'general', 'sedes']);
  });

  it('sin tenant no hay link que dar', () => {
    expect(armar({ slug: null }).link('nuevo')).toBeUndefined();
  });

  it('sin tenant, navegar es un error tipado y no una URL rota', () => {
    expect(() => armar({ slug: null }).ir('nuevo')).toThrow(SinTenantActivoError);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('en la lista, la entidad cierra el camino y no enlaza', () => {
    expect(armar().crumbs('Sedes')).toEqual([
      { label: 'Venta', routerLink: ['/t', 'bicigengor', 'venta'] },
      { label: 'Sedes', routerLink: undefined },
    ]);
  });

  it('con hijas, la entidad enlaza a su lista dentro del módulo activo', () => {
    expect(armar().crumbs('Sedes', { label: 'Bodega norte' })).toEqual([
      { label: 'Venta', routerLink: ['/t', 'bicigengor', 'venta'] },
      { label: 'Sedes', routerLink: ['/t', 'bicigengor', 'venta', 'sedes'] },
      { label: 'Bodega norte' },
    ]);
  });
});
