import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, lastValueFrom, of, throwError } from 'rxjs';
import { DOCUMENT_TYPE_ID, ENVIRONMENT, TenantService } from '@reddoc/core';
import { ConfiguracionCajaStore } from './configuracion-caja.store';
import { ConfiguracionEmpresaService } from './configuracion-empresa.service';
import type { PosDocumentoTipoId } from './configuracion-caja.model';

const almacen = { id: 2, nombre: 'Principal' };
const cuenta = { id: 9, nombre: 'Caja general' };
const POS = DOCUMENT_TYPE_ID.FACTURA_POS;
const POS_ELECTRONICA = DOCUMENT_TYPE_ID.FACTURA_POS_ELECTRONICO;

describe('ConfiguracionCajaStore', () => {
  function preparar(tipo: PosDocumentoTipoId | null = POS) {
    const slug = signal<string | null>('acme');
    const empresa = {
      tipoDocumentoPos: jest.fn(() => of<PosDocumentoTipoId | null>(tipo)),
      guardarTipoDocumentoPos: jest.fn((t: PosDocumentoTipoId) => of<PosDocumentoTipoId | null>(t)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: { currentSlug: slug } },
        { provide: ConfiguracionEmpresaService, useValue: empresa },
      ],
    });
    const store = TestBed.inject(ConfiguracionCajaStore);
    TestBed.tick();
    return { store, slug, empresa };
  }

  beforeEach(() => localStorage.clear());

  it('junta el tipo de la empresa con lo guardado en la caja', () => {
    localStorage.setItem(
      'pos:config:acme',
      JSON.stringify({ almacen, cuentaEfectivo: cuenta, sede: null, asesor: null }),
    );
    const { store } = preparar();
    expect(store.estadoTipo()).toBe('listo');
    expect(store.configuracion()).toEqual({
      documentoTipoId: POS,
      almacen,
      cuentaEfectivo: cuenta,
      sede: null,
      asesor: null,
    });
    expect(store.completa()).toBe(true);
  });

  it('lo guardado antes de pasar el tipo al backend conserva almacén y cuenta', () => {
    localStorage.setItem(
      'pos:config:acme',
      JSON.stringify({
        documentoTipoId: POS_ELECTRONICA,
        almacen,
        cuentaEfectivo: cuenta,
        sede: null,
        asesor: null,
      }),
    );
    const { store } = preparar(POS);
    expect(store.configuracion().almacen).toEqual(almacen);
    expect(store.configuracion().documentoTipoId).toBe(POS);
  });

  it('sin tipo en la empresa la caja no está completa', () => {
    const { store } = preparar(null);
    store.guardarLocal({ almacen, cuentaEfectivo: cuenta, sede: null, asesor: null });
    expect(store.completa()).toBe(false);
  });

  it('si falla la lectura queda en error y se puede reintentar', () => {
    const { store, empresa } = preparar();
    empresa.tipoDocumentoPos.mockReturnValueOnce(throwError(() => new Error('500')));
    store.recargarTipo();
    expect(store.estadoTipo()).toBe('error');
    expect(store.configuracion().documentoTipoId).toBeNull();

    store.recargarTipo();
    expect(store.estadoTipo()).toBe('listo');
    expect(store.configuracion().documentoTipoId).toBe(POS);
  });

  it('mientras carga no hay tipo', () => {
    const { store, empresa } = preparar();
    const respuesta = new Subject<PosDocumentoTipoId | null>();
    empresa.tipoDocumentoPos.mockReturnValueOnce(respuesta);
    store.recargarTipo();
    expect(store.estadoTipo()).toBe('cargando');
    expect(store.configuracion().documentoTipoId).toBeNull();
  });

  it('al cambiar de empresa vuelve a pedir el tipo', () => {
    const { store, slug, empresa } = preparar(POS);
    empresa.tipoDocumentoPos.mockReturnValueOnce(of(POS_ELECTRONICA));
    slug.set('globex');
    TestBed.tick();
    expect(empresa.tipoDocumentoPos).toHaveBeenCalledTimes(2);
    expect(store.configuracion().documentoTipoId).toBe(POS_ELECTRONICA);
  });

  it('guardar el tipo lo manda a la empresa y la caja lo usa', async () => {
    const { store, empresa } = preparar(POS);
    await lastValueFrom(store.guardarTipo(POS_ELECTRONICA));
    expect(empresa.guardarTipoDocumentoPos).toHaveBeenCalledWith(POS_ELECTRONICA);
    expect(store.configuracion().documentoTipoId).toBe(POS_ELECTRONICA);
  });

  it('lo de la caja se guarda en el navegador, sin el tipo', () => {
    const { store } = preparar();
    store.guardarLocal({ almacen, cuentaEfectivo: cuenta, sede: null, asesor: null });
    expect(JSON.parse(localStorage.getItem('pos:config:acme') ?? 'null')).toEqual({
      almacen,
      cuentaEfectivo: cuenta,
      sede: null,
      asesor: null,
    });
  });
});

describe('ConfiguracionEmpresaService', () => {
  function preparar() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { apiUrl: '/api', turnstileSiteKey: '' } },
      ],
    });
    return {
      servicio: TestBed.inject(ConfiguracionEmpresaService),
      http: TestBed.inject(HttpTestingController),
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lee ven_pos_documento_tipo de configuracion/campos/', async () => {
    const { servicio, http } = preparar();
    const tipo = lastValueFrom(servicio.tipoDocumentoPos());
    const req = http.expectOne((r) => r.url === '/api/general/configuracion/campos/');
    expect(req.request.params.get('campos')).toBe('ven_pos_documento_tipo');
    req.flush({ ven_pos_documento_tipo: POS_ELECTRONICA });
    expect(await tipo).toBe(POS_ELECTRONICA);
  });

  it('un tipo que no es de la familia POS cuenta como no configurado', async () => {
    const { servicio, http } = preparar();
    const tipo = lastValueFrom(servicio.tipoDocumentoPos());
    http.expectOne(() => true).flush({ ven_pos_documento_tipo: 1 });
    expect(await tipo).toBeNull();
  });

  it('guarda con PATCH en configuracion/actualizar/', async () => {
    const { servicio, http } = preparar();
    const guardado = lastValueFrom(servicio.guardarTipoDocumentoPos(POS));
    const req = http.expectOne('/api/general/configuracion/actualizar/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ ven_pos_documento_tipo: POS });
    req.flush({ ven_pos_documento_tipo: POS });
    expect(await guardado).toBe(POS);
  });
});
