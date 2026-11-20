import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, lastValueFrom, of, throwError } from 'rxjs';
import {
  ConfiguracionUsuarioStore,
  DOCUMENT_TYPE_ID,
  ENVIRONMENT,
  TenantService,
  type ConfiguracionUsuarioRead,
  type ErpSelectOption,
  type EstadoConfiguracionUsuario,
} from '@reddoc/core';
import { ConfiguracionCajaStore } from './configuracion-caja.store';
import { ConfiguracionEmpresaService } from './configuracion-empresa.service';
import type { PosDocumentoTipoId } from './configuracion-caja.model';

const almacen = { id: 2, nombre: 'Principal' };
const bodega = { id: 4, nombre: 'Bodega' };
const norte = { id: 7, nombre: 'Norte' };
const asesor = { id: 5, nombre: 'Ana' };
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
    // Configuración del usuario: por defecto ya leída y vacía.
    const usuario = {
      almacen: signal<ErpSelectOption | null>(null),
      sede: signal<ErpSelectOption | null>(null),
      caja: signal<ErpSelectOption | null>(null),
      estado: signal<EstadoConfiguracionUsuario>('listo'),
      cargar: jest.fn(() => of(null)),
      guardar: jest.fn(() => of({} as ConfiguracionUsuarioRead)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: TenantService, useValue: { currentSlug: slug } },
        { provide: ConfiguracionEmpresaService, useValue: empresa },
        { provide: ConfiguracionUsuarioStore, useValue: usuario },
      ],
    });
    const store = TestBed.inject(ConfiguracionCajaStore);
    TestBed.tick();
    return { store, slug, empresa, usuario };
  }

  beforeEach(() => localStorage.clear());

  it('junta el tipo de la empresa con lo guardado en la caja', () => {
    localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: null, asesor: null }));
    const { store } = preparar();
    expect(store.estadoTipo()).toBe('listo');
    expect(store.configuracion()).toEqual({
      documentoTipoId: POS,
      almacen,
      sede: null,
      asesor: null,
    });
    expect(store.completa()).toBe(true);
  });

  it('lo guardado con las cuentas de antes conserva almacén, sede y asesor', () => {
    localStorage.setItem(
      'pos:config:acme',
      JSON.stringify({
        almacen,
        cuentaEfectivo: cuenta,
        cuentaTransferencia: { id: 11, nombre: 'Bancolombia' },
        sede: null,
        asesor: null,
      }),
    );
    const { store } = preparar();
    expect(store.configuracion()).toEqual({
      documentoTipoId: POS,
      almacen,
      sede: null,
      asesor: null,
    });
  });

  it('lo guardado antes de pasar el tipo al backend conserva el almacén', () => {
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
    const { store, usuario } = preparar(null);
    usuario.almacen.set(almacen);
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

  it('el asesor se guarda en el navegador, sin el tipo', () => {
    const { store } = preparar();
    store.guardarAsesor(asesor);
    expect(JSON.parse(localStorage.getItem('pos:config:acme') ?? 'null')).toEqual({
      almacen: null,
      sede: null,
      asesor,
    });
    expect(store.configuracion().asesor).toEqual(asesor);
  });

  describe('configuración del usuario', () => {
    it('almacén y sede del usuario ganan sobre lo del navegador', () => {
      localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: null, asesor }));
      const { store, usuario } = preparar();
      usuario.almacen.set(bodega);
      usuario.sede.set(norte);
      expect(store.configuracion()).toEqual({
        documentoTipoId: POS,
        almacen: bodega,
        sede: norte,
        asesor,
      });
    });

    it('sin valor del usuario, lo del navegador queda de respaldo campo por campo', () => {
      localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: norte, asesor }));
      const { store, usuario } = preparar();
      usuario.sede.set({ id: 8, nombre: 'Sur' });
      expect(store.configuracion().almacen).toEqual(almacen);
      expect(store.configuracion().sede).toEqual({ id: 8, nombre: 'Sur' });
    });

    it('se pide al entrar y al cambiar de empresa', () => {
      const { slug, usuario } = preparar();
      expect(usuario.cargar).toHaveBeenCalledTimes(1);
      slug.set('globex');
      TestBed.tick();
      expect(usuario.cargar).toHaveBeenCalledTimes(2);
    });

    it('guardar la operación manda ids al usuario y borra el respaldo, no el asesor', async () => {
      localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: norte, asesor }));
      const { store, usuario } = preparar();
      await lastValueFrom(store.guardarOperacion({ almacen: bodega, sede: norte, caja: null }));
      expect(usuario.guardar).toHaveBeenCalledWith({ almacen: 4, sede: 7, caja: null });
      expect(JSON.parse(localStorage.getItem('pos:config:acme') ?? 'null')).toEqual({
        almacen: null,
        sede: null,
        asesor,
      });
    });

    it('si falla al guardar, el respaldo se conserva', async () => {
      localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: null, asesor }));
      const { store, usuario } = preparar();
      usuario.guardar.mockReturnValueOnce(throwError(() => new Error('400')));
      await expect(
        lastValueFrom(store.guardarOperacion({ almacen: bodega, sede: null, caja: null })),
      ).rejects.toThrow();
      expect(store.configuracion().almacen).toEqual(almacen);
    });

    it('mientras carga, la caja está cargando', () => {
      const { store, usuario } = preparar();
      usuario.estado.set('cargando');
      expect(store.estado()).toBe('cargando');
    });

    it('si falla y no hay respaldo, la caja está en error', () => {
      const { store, usuario } = preparar();
      usuario.estado.set('error');
      expect(store.estado()).toBe('error');
    });

    it('si falla pero el respaldo alcanza, la caja sigue lista', () => {
      localStorage.setItem('pos:config:acme', JSON.stringify({ almacen, sede: null, asesor }));
      const { store, usuario } = preparar();
      usuario.estado.set('error');
      expect(store.estado()).toBe('listo');
      expect(store.completa()).toBe(true);
    });

    it('reintentar pide de nuevo solo lo que falló', () => {
      const { store, usuario, empresa } = preparar();
      usuario.estado.set('error');
      store.recargar();
      expect(usuario.cargar).toHaveBeenCalledTimes(2);
      expect(empresa.tipoDocumentoPos).toHaveBeenCalledTimes(1);
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

  it('lee los textos de la tirilla; los que no hay quedan vacíos', async () => {
    const { servicio, http } = preparar();
    const textos = lastValueFrom(servicio.textosTirilla());
    const req = http.expectOne((r) => r.url === '/api/general/configuracion/campos/');
    expect(req.request.params.get('campos')).toBe(
      'ven_pos_informacion_superior,ven_pos_informacion_inferior',
    );
    req.flush({
      ven_pos_informacion_superior: 'Régimen simple',
      ven_pos_informacion_inferior: null,
    });
    expect(await textos).toEqual({ superior: 'Régimen simple', inferior: '' });
  });

  it('guarda los textos recortados y manda null el que queda en blanco', async () => {
    const { servicio, http } = preparar();
    const guardado = lastValueFrom(
      servicio.guardarTextosTirilla({ superior: '  Régimen simple ', inferior: '   ' }),
    );
    const req = http.expectOne('/api/general/configuracion/actualizar/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      ven_pos_informacion_superior: 'Régimen simple',
      ven_pos_informacion_inferior: null,
    });
    req.flush({
      ven_pos_informacion_superior: 'Régimen simple',
      ven_pos_informacion_inferior: null,
    });
    expect(await guardado).toEqual({ superior: 'Régimen simple', inferior: '' });
  });
});
