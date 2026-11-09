import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FileDownloadService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import { dictionaries } from '@erp/i18n';
import { CuentaCobrarCorteService } from '../../cuenta-cobrar-corte.service';
import { CuentaCobrarCorteListComponent } from './cuenta-cobrar-corte-list.component';

describe('CuentaCobrarCorteListComponent · generar', () => {
  const servicio = { list: jest.fn(() => of({ results: [], count: 0 })) };
  const toast = { warn: jest.fn(), error: jest.fn() };
  let component: CuentaCobrarCorteListComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: CuentaCobrarCorteService, useValue: servicio },
        { provide: ToastService, useValue: toast },
        { provide: FileDownloadService, useValue: {} },
        { provide: TenantService, useValue: {} },
        { provide: ActiveModuleStore, useValue: {} },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
      ],
    });
    TestBed.overrideComponent(CuentaCobrarCorteListComponent, {
      set: { template: '', imports: [] },
    });
    component = TestBed.createComponent(CuentaCobrarCorteListComponent).componentInstance;
  });

  it('con la fecha vacía avisa y no consulta', () => {
    component['fecha'].set(null);

    component['generar']();

    expect(toast.warn).toHaveBeenCalledWith(
      dictionaries.es.entities.cuentaCobrarCorte.fechaRequerida,
    );
    expect(servicio.list).not.toHaveBeenCalled();
    expect(component['generated']()).toBe(false);
  });

  it('con fecha consulta ese corte', () => {
    component['fecha'].set(new Date(2026, 9, 31));

    component['generar']();

    expect(toast.warn).not.toHaveBeenCalled();
    expect(servicio.list).toHaveBeenCalledWith('2026-10-31', expect.anything());
  });
});
