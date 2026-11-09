import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FileDownloadService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import { dictionaries } from '@erp/i18n';
import { MovimientoInformePageBase } from './movimiento-informe-page.base';
import type { MovimientoInformeService } from './movimiento-informe.service';

const servicio = {
  exportUrl: '/excel/',
  pdfUrl: '/pdf/',
  buildBody: jest.fn(() => ({})),
  list: jest.fn(() => of({ results: [], count: 60 })),
  totales: jest.fn(() => of(null)),
};

const descarga = { download: jest.fn(() => of(undefined)) };

class InformeDePrueba extends MovimientoInformePageBase<unknown> {
  protected override readonly service = servicio as unknown as MovimientoInformeService<unknown>;
  protected override readonly archivo = 'informe';
  protected override get nombre(): string {
    return 'Informe';
  }
}

/** Ahora que las fechas se teclean, el formulario puede quedar sin ellas después de generar. */
describe('MovimientoInformePageBase · fecha vacía', () => {
  let informe: InformeDePrueba;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: FileDownloadService, useValue: descarga },
        { provide: TenantService, useValue: {} },
        { provide: ActiveModuleStore, useValue: {} },
        { provide: ToastService, useValue: {} },
        { provide: I18nService, useValue: { t: signal(dictionaries.es), lang: signal('es') } },
      ],
    });
    informe = TestBed.runInInjectionContext(() => new InformeDePrueba());
    informe['generar']();
    jest.clearAllMocks();
  });

  const borrarFecha = (): void =>
    informe['form'].controls.fecha_desde.setValue(null as unknown as Date);

  it('no genera y marca el formulario', () => {
    borrarFecha();

    informe['generar']();

    expect(servicio.list).not.toHaveBeenCalled();
    expect(informe['form'].controls.fecha_desde.touched).toBe(true);
  });

  it('no pagina con la fecha vacía', () => {
    borrarFecha();

    informe['onPageChange']({ page: 1 });

    expect(servicio.list).not.toHaveBeenCalled();
    expect(informe['page']()).toBe(0);
    expect(informe['form'].controls.fecha_desde.touched).toBe(true);
  });

  it('no exporta con la fecha vacía', () => {
    borrarFecha();

    informe['exportExcel']();

    expect(descarga.download).not.toHaveBeenCalled();
  });

  it('con las fechas completas pagina y exporta', () => {
    informe['onPageChange']({ page: 1 });
    informe['exportExcel']();

    expect(servicio.list).toHaveBeenCalledTimes(1);
    expect(descarga.download).toHaveBeenCalledTimes(1);
  });
});
