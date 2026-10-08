import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ENVIRONMENT, TenantService } from '@reddoc/core';
import { FacturaElectronicaService } from './factura-electronica.service';
import type { EmisorConsulta } from './factura-electronica.model';

describe('FacturaElectronicaService', () => {
  let service: FacturaElectronicaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(FacturaElectronicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('consultarEmisor', () => {
    const URL = '/api/general/electronico/emisor-consultar/';

    it('con emisor devuelve registrado y sus datos', () => {
      let resultado: EmisorConsulta | undefined;
      service.consultarEmisor().subscribe((r) => (resultado = r));
      http.expectOne(URL).flush({ id: 7, razon_social: 'termu' });
      expect(resultado).toEqual({ registrado: true, emisor: { id: 7, razon_social: 'termu' } });
    });

    it('un 404 no es una falla: es que no hay emisor', () => {
      let resultado: EmisorConsulta | undefined;
      service.consultarEmisor().subscribe((r) => (resultado = r));
      http
        .expectOne(URL)
        .flush(
          { detail: 'La empresa no tiene emisor configurado.' },
          { status: 404, statusText: 'Not Found' },
        );
      expect(resultado).toEqual({ registrado: false });
    });

    it('cualquier otro error sigue fallando', () => {
      const error = jest.fn();
      service.consultarEmisor().subscribe({ error });
      http.expectOne(URL).flush({}, { status: 500, statusText: 'Server Error' });
      expect(error).toHaveBeenCalled();
    });
  });

  describe('consultarCertificado', () => {
    const URL = '/api/general/electronico/certificado-consultar/';

    it('toma el primero de la lista', () => {
      let resultado: unknown;
      service.consultarCertificado().subscribe((r) => (resultado = r));
      http.expectOne(URL).flush({ count: 1, results: [{ id: 2, nombre_archivo: 'a.pfx' }] });
      expect(resultado).toEqual({ id: 2, nombre_archivo: 'a.pfx' });
    });

    it('sin resultados es null', () => {
      let resultado: unknown = 'sin respuesta';
      service.consultarCertificado().subscribe((r) => (resultado = r));
      http.expectOne(URL).flush({ count: 0, results: [] });
      expect(resultado).toBeNull();
    });
  });

  it('reasignar manda el id del emisor en el cuerpo', () => {
    service.reasignarEmisor(7).subscribe();
    const req = http.expectOne('/api/general/electronico/emisor-reasignar/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ emisor: 7 });
    req.flush(null);
  });

  it('cargar el certificado sube archivo y clave por multipart', () => {
    service.cargarCertificado(new File(['x'], 'cert.pfx'), 'secreta').subscribe();
    const req = http.expectOne('/api/general/electronico/certificado-cargar/');
    const form = req.request.body as FormData;
    expect(form.get('archivo')).toBeInstanceOf(File);
    expect(form.get('clave')).toBe('secreta');
    req.flush(null);
  });

  describe('consultarSoftware', () => {
    it('consulta por módulo y devuelve las filas', () => {
      let resultado: readonly unknown[] | undefined;
      service.consultarSoftware('facturacion').subscribe((r) => (resultado = r));
      const req = http.expectOne((r) => r.url === '/api/general/electronico/software-consultar/');
      expect(req.request.params.get('modulo')).toBe('facturacion');
      req.flush({ count: 1, results: [{ id: 3, tipo: 'facturacion' }] });
      expect(resultado).toEqual([{ id: 3, tipo: 'facturacion' }]);
    });
  });

  describe('actualizarSoftware', () => {
    it('manda PATCH con el id y solo lo que cambia', () => {
      service.actualizarSoftware({ id: 3, identificador: 'abc' }).subscribe();
      const req = http.expectOne('/api/general/electronico/software-actualizar/');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ id: 3, identificador: 'abc' });
      req.flush({});
    });
  });
});
