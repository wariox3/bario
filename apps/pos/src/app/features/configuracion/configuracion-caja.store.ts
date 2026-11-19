import {
  Injectable,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  type Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ConfiguracionUsuarioStore, TenantService, type ErpSelectOption } from '@reddoc/core';
import { PosStorageService } from '../../core/storage/pos-storage.service';
import {
  CONFIGURACION_LOCAL_VACIA,
  configuracionCompleta,
  esConfiguracionLocal,
  soloLocal,
  type ConfiguracionCaja,
  type ConfiguracionLocal,
  type PosDocumentoTipoId,
} from './configuracion-caja.model';
import { ConfiguracionEmpresaService } from './configuracion-empresa.service';

/** Lectura del tipo de documento de la empresa. */
export type EstadoTipoDocumento = 'cargando' | 'listo' | 'error';

/** Lectura de todo lo que la caja necesita: el tipo de la empresa y la configuración del usuario. */
export type EstadoConfiguracionCaja = EstadoTipoDocumento;

/** Lo que la caja guarda en la configuración del usuario (backend). */
export interface OperacionUsuario {
  readonly almacen: ErpSelectOption | null;
  readonly sede: ErpSelectOption | null;
  readonly caja: ErpSelectOption | null;
}

/**
 * Configuración de la caja del tenant activo, con tres dueños. Quien la consume
 * ve una sola `ConfiguracionCaja`.
 *
 * - **La empresa:** el tipo de documento, del backend.
 * - **El usuario:** almacén y sede, de `ConfiguracionUsuarioStore` (la misma que
 *   edita el ERP en Configuración → Usuario). Lo que este navegador guardó antes
 *   de que existiera queda de respaldo, campo por campo, mientras el usuario no
 *   tenga el suyo: así nadie se queda sin poder cobrar el día del cambio.
 * - **El equipo:** el asesor por defecto, en el navegador.
 *
 * Se recalcula sola al cambiar de tenant: la clave local lleva el slug, el tipo
 * se vuelve a pedir y la configuración del usuario también.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionCajaStore {
  private readonly tenant = inject(TenantService);
  private readonly storage = inject(PosStorageService);
  private readonly empresa = inject(ConfiguracionEmpresaService);
  private readonly usuario = inject(ConfiguracionUsuarioStore);

  private readonly clave = computed(() => {
    const slug = this.tenant.currentSlug();
    return slug ? `pos:config:${slug}` : null;
  });

  private readonly local = linkedSignal<ConfiguracionLocal>(() => {
    const clave = this.clave();
    const guardado = clave ? this.storage.leer(clave, esConfiguracionLocal) : null;
    return guardado ? soloLocal(guardado) : CONFIGURACION_LOCAL_VACIA;
  });

  private readonly tipo = signal<PosDocumentoTipoId | null>(null);
  private readonly _estadoTipo = signal<EstadoTipoDocumento>('cargando');
  private readonly recargas = new Subject<void>();

  readonly estadoTipo = this._estadoTipo.asReadonly();

  readonly configuracion = computed<ConfiguracionCaja>(() => {
    const local = this.local();
    return {
      documentoTipoId: this.tipo(),
      almacen: this.usuario.almacen() ?? local.almacen,
      sede: this.usuario.sede() ?? local.sede,
      asesor: local.asesor,
    };
  });

  /** La caja tiene lo mínimo para vender. */
  readonly completa = computed(() => configuracionCompleta(this.configuracion()));

  /**
   * `cargando` mientras falte alguna lectura, para no avisar "configura la caja"
   * antes de tiempo. Un fallo del tipo es `error`; uno de la configuración del
   * usuario, solo si sin ella la caja queda incompleta (el respaldo local puede
   * bastar).
   */
  readonly estado = computed((): EstadoConfiguracionCaja => {
    const tipo = this._estadoTipo();
    const usuario = this.usuario.estado();
    if (tipo === 'error' || (usuario === 'error' && !this.completa())) return 'error';
    if (tipo === 'cargando' || usuario === 'cargando') return 'cargando';
    return 'listo';
  });

  constructor() {
    combineLatest([toObservable(this.tenant.currentSlug), this.recargas.pipe(startWith(undefined))])
      .pipe(
        switchMap(([slug]) => {
          // El tipo de la empresa anterior no vale para esta.
          this.tipo.set(null);
          this._estadoTipo.set('cargando');
          if (!slug) return EMPTY;
          return this.empresa.tipoDocumentoPos().pipe(
            tap((tipo) => {
              this.tipo.set(tipo);
              this._estadoTipo.set('listo');
            }),
            catchError(() => {
              this._estadoTipo.set('error');
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    // La del usuario se pide al entrar a cada empresa; el store no repite si ya la tiene.
    effect(() => {
      this.tenant.currentSlug();
      untracked(() => this.usuario.cargar().subscribe());
    });
  }

  /** Vuelve a pedir el tipo de documento (tras un error de red). */
  recargarTipo(): void {
    this.recargas.next();
  }

  /** Vuelve a pedir todo lo que falló: el tipo y la configuración del usuario. */
  recargar(): void {
    if (this._estadoTipo() === 'error') this.recargarTipo();
    if (this.usuario.estado() === 'error') this.usuario.cargar().subscribe();
  }

  /** Guarda el asesor por defecto de este equipo en el navegador. */
  guardarAsesor(asesor: ErpSelectOption | null): void {
    this.escribirLocal({ ...this.local(), asesor });
  }

  /**
   * Guarda almacén, sede y caja en la configuración del usuario. Ya guardados,
   * el respaldo del navegador sobra: se borra para que un valor que el usuario
   * vacíe no vuelva desde ahí.
   */
  guardarOperacion(operacion: OperacionUsuario): Observable<void> {
    return this.usuario
      .guardar({
        almacen: operacion.almacen?.id ?? null,
        sede: operacion.sede?.id ?? null,
        caja: operacion.caja?.id ?? null,
      })
      .pipe(
        tap(() => this.escribirLocal({ ...this.local(), almacen: null, sede: null })),
        map(() => undefined),
      );
  }

  private escribirLocal(config: ConfiguracionLocal): void {
    const limpio = soloLocal(config);
    this.local.set(limpio);
    const clave = this.clave();
    if (clave) this.storage.escribir(clave, limpio);
  }

  /** Cambia el tipo de documento de la empresa: lo verán todas sus cajas. */
  guardarTipo(tipo: PosDocumentoTipoId): Observable<void> {
    return this.empresa.guardarTipoDocumentoPos(tipo).pipe(
      tap((guardado) => {
        this.tipo.set(guardado);
        this._estadoTipo.set('listo');
      }),
      map(() => undefined),
    );
  }
}
