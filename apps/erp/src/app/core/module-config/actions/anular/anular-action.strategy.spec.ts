import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
  type DocumentEntityConfig,
} from '@reddoc/core';
import { dictionaries } from '@erp/i18n';
import type { EntityActionContext } from '../entity-action-strategy';
import { AnularActionStrategy } from './anular-action.strategy';

const DOCUMENTO = {
  id: 'nomina-electronica',
  capabilities: { canAnular: true },
} as DocumentEntityConfig;

function contexto(over: Partial<EntityActionContext> = {}): EntityActionContext {
  return {
    document: DOCUMENTO,
    query: { filters: [], sort: [], page: 0 },
    selectedIds: [],
    totalCount: 10,
    reload: jest.fn(),
    clearSelection: jest.fn(),
    ...over,
  };
}

function rechazo(detail: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: 400, error: { detail } });
}

describe('Anular desde el listado', () => {
  const gateway = { anular: jest.fn() };
  const toast = { success: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const dialog = { open: jest.fn() };

  /** El modal de confirmación cierra con lo que diga la persona. */
  function confirma(respuesta: boolean): void {
    dialog.open.mockReturnValue({ onClose: of(respuesta) });
  }

  async function ejecutar(ctx: EntityActionContext): Promise<void> {
    const strategy = TestBed.inject(AnularActionStrategy);
    await firstValueFrom(strategy.execute(ctx), { defaultValue: undefined });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        AnularActionStrategy,
        { provide: ENTITY_DATA_GATEWAY, useValue: gateway },
        { provide: ToastService, useValue: toast },
        { provide: DialogService, useValue: dialog },
        { provide: I18nService, useValue: { t: () => dictionaries.es } },
      ],
    });
  });

  it('solo se ofrece en documentos que se anulan', () => {
    const strategy = TestBed.inject(AnularActionStrategy);
    expect(strategy.isAvailable(DOCUMENTO)).toBe(true);
    expect(strategy.isAvailable({ capabilities: {} } as DocumentEntityConfig)).toBe(false);
  });

  it('sin selección avisa y no pregunta ni anula', async () => {
    await ejecutar(contexto());
    expect(toast.warn).toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(gateway.anular).not.toHaveBeenCalled();
  });

  it('si la persona cancela no anula nada', async () => {
    confirma(false);
    const ctx = contexto({ selectedIds: [4, 9] });
    await ejecutar(ctx);
    expect(gateway.anular).not.toHaveBeenCalled();
    expect(ctx.reload).not.toHaveBeenCalled();
  });

  it('anula cada documento sin el toast del interceptor y recarga', async () => {
    confirma(true);
    gateway.anular.mockReturnValue(of({}));
    const ctx = contexto({ selectedIds: [4, 9] });
    await ejecutar(ctx);

    expect(gateway.anular.mock.calls).toEqual([
      [DOCUMENTO, 4, { errorToast: false }],
      [DOCUMENTO, 9, { errorToast: false }],
    ]);
    expect(toast.success).toHaveBeenCalledWith('Documentos anulados', 'Se anularon 2 documentos.');
    expect(ctx.clearSelection).toHaveBeenCalled();
    expect(ctx.reload).toHaveBeenCalled();
  });

  it('un rechazo no corta el lote: resume lo anulado y el motivo de lo que no', async () => {
    confirma(true);
    gateway.anular.mockImplementation((_doc: unknown, id: number) =>
      id === 9 ? throwError(() => rechazo('El documento está contabilizado.')) : of({}),
    );
    const ctx = contexto({ selectedIds: [4, 9, 12] });
    await ejecutar(ctx);

    expect(gateway.anular).toHaveBeenCalledTimes(3);
    expect(toast.warn).toHaveBeenCalledWith(
      'Se anularon 2 de 3',
      'ID 9: El documento está contabilizado.',
    );
    expect(ctx.reload).toHaveBeenCalled();
  });

  it('si ninguno se anula avisa el error y no recarga', async () => {
    confirma(true);
    gateway.anular.mockReturnValue(throwError(() => rechazo('No está aprobado.')));
    const ctx = contexto({ selectedIds: [1, 2, 3, 4, 5] });
    await ejecutar(ctx);

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo anular',
      'ID 1: No está aprobado. · ID 2: No está aprobado. · ID 3: No está aprobado. y 2 más',
    );
    expect(ctx.clearSelection).not.toHaveBeenCalled();
    expect(ctx.reload).not.toHaveBeenCalled();
  });
});
