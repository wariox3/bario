import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
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
import { TenantService } from '@reddoc/core';
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

/**
 * Configuración de la caja del tenant activo: el tipo de documento lo trae del
 * backend (es de la empresa) y el resto lo lee del navegador (es de la caja).
 * Quien la consume ve una sola `ConfiguracionCaja`.
 *
 * Se recalcula sola al cambiar de tenant: la clave local lleva el slug y el
 * tipo se vuelve a pedir.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionCajaStore {
  private readonly tenant = inject(TenantService);
  private readonly storage = inject(PosStorageService);
  private readonly empresa = inject(ConfiguracionEmpresaService);

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

  readonly configuracion = computed<ConfiguracionCaja>(() => ({
    documentoTipoId: this.tipo(),
    ...this.local(),
  }));

  /** La caja tiene lo mínimo para vender. */
  readonly completa = computed(() => configuracionCompleta(this.configuracion()));

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
  }

  /** Vuelve a pedir el tipo de documento (tras un error de red). */
  recargarTipo(): void {
    this.recargas.next();
  }

  /** Guarda lo de esta caja en el navegador. */
  guardarLocal(config: ConfiguracionLocal): void {
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
