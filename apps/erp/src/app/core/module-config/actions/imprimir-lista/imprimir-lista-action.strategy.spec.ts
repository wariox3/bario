import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
  type DocumentEntityConfig,
  type ListQuery,
} from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import type { EntityActionContext } from '../entity-action-strategy';
import { ImprimirListaActionStrategy } from './imprimir-lista-action.strategy';
import { ImprimirZipActionStrategy } from './imprimir-zip-action.strategy';

const QUERY: ListQuery = {
  filters: [{ field: 'contacto_id', operator: 'eq', value: 3 }],
  sort: [],
  page: 0,
};

function contexto(over: Partial<EntityActionContext> = {}): EntityActionContext {
  return {
    document: { id: 'factura-venta' } as DocumentEntityConfig,
    query: QUERY,
    selectedIds: [],
    totalCount: 10,
    reload: jest.fn(),
    ...over,
  };
}

describe('Imprimir desde el listado', () => {
  const gateway = {
    imprimirLista: jest.fn(() => of(undefined)),
    imprimirZip: jest.fn(() => of(undefined)),
  };
  const toast = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const dialog = { open: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        ImprimirListaActionStrategy,
        ImprimirZipActionStrategy,
        { provide: ENTITY_DATA_GATEWAY, useValue: gateway },
        { provide: ToastService, useValue: toast },
        { provide: DialogService, useValue: dialog },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
      ],
    });
  });

  it('sin selección imprime lo filtrado tal cual', async () => {
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(strategy.execute(contexto()), { defaultValue: undefined });
    expect(gateway.imprimirLista).toHaveBeenCalledWith({ id: 'factura-venta' }, QUERY);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('con filas marcadas imprime solo esas, con el id como array', async () => {
    const strategy = TestBed.inject(ImprimirZipActionStrategy);
    await firstValueFrom(strategy.execute(contexto({ selectedIds: [4, 9], totalCount: 500 })), {
      defaultValue: undefined,
    });
    expect(gateway.imprimirZip).toHaveBeenCalledWith(
      { id: 'factura-venta' },
      { ...QUERY, filters: [...QUERY.filters, { field: 'id', operator: 'in', value: [4, 9] }] },
    );
    // Dos documentos no piden confirmación aunque el listado tenga 500.
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('sin selección ni filtros avisa en vez de imprimir todo el tipo', async () => {
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(
      strategy.execute(contexto({ query: { ...QUERY, filters: [] }, totalCount: 30 })),
      { defaultValue: undefined },
    );
    expect(toast.warn).toHaveBeenCalledWith(
      'Elige qué imprimir',
      'Selecciona documentos o aplica un filtro para imprimir.',
    );
    expect(gateway.imprimirLista).not.toHaveBeenCalled();
  });

  it('sin filtros pero con filas marcadas imprime esas', async () => {
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(
      strategy.execute(contexto({ query: { ...QUERY, filters: [] }, selectedIds: [7] })),
      { defaultValue: undefined },
    );
    expect(gateway.imprimirLista).toHaveBeenCalledWith(
      { id: 'factura-venta' },
      { ...QUERY, filters: [{ field: 'id', operator: 'in', value: [7] }] },
    );
  });

  it('sin documentos avisa y no pide nada al backend', async () => {
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(strategy.execute(contexto({ totalCount: 0 })), {
      defaultValue: undefined,
    });
    expect(toast.warn).toHaveBeenCalled();
    expect(gateway.imprimirLista).not.toHaveBeenCalled();
  });

  it('con muchos documentos pregunta antes y respeta el cancelar', async () => {
    dialog.open.mockReturnValue({ onClose: of(false) });
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(strategy.execute(contexto({ totalCount: 51 })), {
      defaultValue: undefined,
    });
    expect(dialog.open).toHaveBeenCalled();
    expect(gateway.imprimirLista).not.toHaveBeenCalled();
  });

  it('con muchos documentos imprime al confirmar', async () => {
    dialog.open.mockReturnValue({ onClose: of(true) });
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(strategy.execute(contexto({ totalCount: 51 })), {
      defaultValue: undefined,
    });
    expect(gateway.imprimirLista).toHaveBeenCalled();
  });

  it('ignora un segundo clic mientras la impresión está en curso', () => {
    const enCurso = new Subject<void>();
    gateway.imprimirLista.mockReturnValueOnce(enCurso);
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    strategy.execute(contexto()).subscribe();
    strategy.execute(contexto()).subscribe();
    expect(gateway.imprimirLista).toHaveBeenCalledTimes(1);
    enCurso.complete();
    strategy.execute(contexto()).subscribe();
    expect(gateway.imprimirLista).toHaveBeenCalledTimes(2);
  });

  it('un error del backend termina en toast y libera la acción', async () => {
    gateway.imprimirLista.mockReturnValueOnce(throwError(() => new Error('falla')));
    const strategy = TestBed.inject(ImprimirListaActionStrategy);
    await firstValueFrom(strategy.execute(contexto()), { defaultValue: undefined });
    await Promise.resolve();
    expect(toast.error).toHaveBeenCalled();
    await firstValueFrom(strategy.execute(contexto()), { defaultValue: undefined });
    expect(gateway.imprimirLista).toHaveBeenCalledTimes(2);
  });
});
