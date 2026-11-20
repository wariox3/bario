import { Injectable, computed, inject, signal } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { AUTH_SERVICE } from '../tokens';
import { TenantService } from '../tenant/tenant.service';
import type { ErpSelectOption } from '../data/erp-select-data.service';
import { ConfiguracionUsuarioService } from './configuracion-usuario.service';
import type {
  ConfiguracionUsuarioPayload,
  ConfiguracionUsuarioRead,
} from './configuracion-usuario.model';

/** Lectura de la configuración del contenedor y usuario activos. */
export type EstadoConfiguracionUsuario = 'cargando' | 'listo' | 'error';

interface Entrada {
  /** Contenedor y usuario a los que pertenece: `slug|usuarioId`. */
  readonly clave: string;
  readonly config: ConfiguracionUsuarioRead;
}

/**
 * La configuración del usuario (sede, almacén y caja por defecto), pedida una
 * sola vez por contenedor y compartida por todos los formularios.
 *
 * - **Una petición por contenedor y usuario.** La copia en memoria lleva la
 *   clave `slug|usuarioId`: al cambiar de contenedor o de sesión deja de valer
 *   sola (`config()` vuelve a `null`) y el próximo `cargar()` la pide de nuevo.
 * - **Nunca falla.** Son sugerencias: si la petición falla, `cargar()` emite
 *   `null`, no avisa (el formulario sigue con su sugerencia de siempre) y no se
 *   cachea el error, así que el próximo `cargar()` reintenta.
 * - **Sin peticiones de más al guardar.** La pestaña Usuario de Configuración
 *   entrega la respuesta de su PATCH con `establecer()`.
 *
 * El workspace la precarga sin esperar; las rutas de alta la esperan con
 * `configuracionUsuarioResolver`, que solo demora en una recarga dura directa
 * sobre el formulario.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionUsuarioStore {
  private readonly service = inject(ConfiguracionUsuarioService);
  private readonly tenant = inject(TenantService);
  private readonly auth = inject(AUTH_SERVICE);

  private readonly entrada = signal<Entrada | null>(null);
  /** Clave cuya última lectura falló; deja de valer sola al cambiar de contenedor o sesión. */
  private readonly falloEn = signal<string | null>(null);
  /** Petición en vuelo y su clave: dos `cargar()` simultáneos comparten una sola. */
  private enVuelo: {
    readonly clave: string;
    readonly config$: Observable<ConfiguracionUsuarioRead | null>;
  } | null = null;

  private readonly claveActual = computed(() => {
    const slug = this.tenant.currentSlug();
    const usuarioId = this.auth.currentUser()?.id;
    return slug && usuarioId != null ? `${slug}|${usuarioId}` : null;
  });

  /** La configuración del contenedor y usuario activos, o `null` si aún no llegó. */
  readonly config = computed((): ConfiguracionUsuarioRead | null => {
    const entrada = this.entrada();
    const clave = this.claveActual();
    return entrada && clave && entrada.clave === clave ? entrada.config : null;
  });

  /**
   * `cargando` hasta que llega la primera lectura; `error` si falló (el próximo
   * `cargar()` reintenta). Sirve a quien no puede operar sin ella, como el POS,
   * para no confundir "todavía no llegó" con "no hay nada configurado".
   */
  readonly estado = computed((): EstadoConfiguracionUsuario => {
    if (this.config()) return 'listo';
    const clave = this.claveActual();
    return clave && this.falloEn() === clave ? 'error' : 'cargando';
  });

  /** Sede por defecto como opción de select (`null` si no hay o aún no llegó). */
  readonly sede = computed(() => {
    const c = this.config();
    return opcion(c?.sede, c?.sede_nombre);
  });

  /** Almacén por defecto como opción de select. */
  readonly almacen = computed(() => {
    const c = this.config();
    return opcion(c?.almacen, c?.almacen_nombre);
  });

  /** Caja por defecto como opción de select. */
  readonly caja = computed(() => {
    const c = this.config();
    return opcion(c?.caja, c?.caja_nombre);
  });

  /**
   * Devuelve la configuración vigente o la pide. Emite una vez y completa;
   * `null` si no hay contenedor/sesión o si la petición falló.
   */
  cargar(): Observable<ConfiguracionUsuarioRead | null> {
    const clave = this.claveActual();
    if (!clave) return of(null);

    const vigente = this.config();
    if (vigente) return of(vigente);
    if (this.enVuelo?.clave === clave) return this.enVuelo.config$;

    this.falloEn.set(null);
    const config$ = this.service.obtener({ errorToast: false }).pipe(
      tap((config) => this.entrada.set({ clave, config })),
      map((config): ConfiguracionUsuarioRead | null => config),
      catchError(() => {
        this.falloEn.set(clave);
        return of(null);
      }),
      tap(() => {
        if (this.enVuelo?.config$ === config$) this.enVuelo = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.enVuelo = { clave, config$ };
    return config$;
  }

  /**
   * Guarda en el backend (PATCH parcial: `null` quita el valor) y deja la copia
   * en memoria con lo que devolvió. Los errores llegan a quien llama.
   */
  guardar(payload: ConfiguracionUsuarioPayload): Observable<ConfiguracionUsuarioRead> {
    return this.service.actualizar(payload).pipe(tap((config) => this.establecer(config)));
  }

  /** Reemplaza la copia en memoria con lo que devolvió el backend (p. ej. tras el PATCH). */
  establecer(config: ConfiguracionUsuarioRead): void {
    const clave = this.claveActual();
    if (clave) this.entrada.set({ clave, config });
  }
}

/**
 * Criterio para el `suggestedMatch` de `<lib-api-select>`: la opción con el id
 * de `porDefecto`. `null` (sin valor por defecto) deja que mande el
 * `suggestedIndex` del select, que es el respaldo cuando la opción no está en
 * el catálogo (p. ej. un almacén desactivado después de configurarlo).
 */
export function coincideConOpcion(
  porDefecto: ErpSelectOption | null,
): ((option: ErpSelectOption) => boolean) | null {
  if (!porDefecto) return null;
  const id = porDefecto.id;
  return (option) => option.id === id;
}

function opcion(
  id: number | null | undefined,
  nombre: string | null | undefined,
): ErpSelectOption | null {
  return id != null ? { id, nombre: nombre ?? '' } : null;
}

/**
 * Asegura la configuración del usuario antes de montar un formulario de alta.
 * Si ya está en memoria resuelve al instante; si falla, resuelve `null` y el
 * formulario sigue con su sugerencia de siempre.
 */
export const configuracionUsuarioResolver: ResolveFn<ConfiguracionUsuarioRead | null> = () =>
  inject(ConfiguracionUsuarioStore).cargar();
