import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ENVIRONMENT, TenantService } from '@reddoc/core';
import { AdicionalService } from './adicional.service';

describe('AdicionalService · importar', () => {
  let service: AdicionalService;
  let http: HttpTestingController;
  const archivo = new File(['x'], 'adicionales.xlsx');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    TestBed.inject(TenantService).setSlug('acme');
    service = TestBed.inject(AdicionalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sube el archivo por multipart en el campo archivo', () => {
    service.importar(archivo).subscribe();
    const req = http.expectOne('/api/humano/adicional/importar/');
    expect(req.request.method).toBe('POST');
    const form = req.request.body as FormData;
    expect(form.get('archivo')).toBeInstanceOf(File);
    expect(form.has('programacion_id')).toBe(false);
    req.flush({});
  });

  it('desde una programación, manda programacion_id y permanente en el multipart', () => {
    service.importar(archivo, { programacion_id: 7, permanente: false }).subscribe();
    const req = http.expectOne('/api/humano/adicional/importar/');
    const form = req.request.body as FormData;
    expect(form.get('archivo')).toBeInstanceOf(File);
    expect(form.get('programacion_id')).toBe('7');
    expect(form.get('permanente')).toBe('false');
    req.flush({});
  });
});
