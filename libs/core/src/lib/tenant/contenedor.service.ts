import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BaseHttpService,
  type ParamValue,
  type RequestOptions,
} from '../services/base-http.service';
import type { PaginatedResponse } from '../models/pagination.model';
import {
  Contenedor,
  ContenedorDetalle,
  ContenedorEstadoResponse,
  ContenedorInvitacionesPendientesResponse,
  ContenedorMembersResponse,
  ContenedoresResponse,
  CreateContenedorRequest,
  GrupoSeguridad,
  PermisoCatalogoFiltros,
  PermisoSeguridad,
  SendInviteRequest,
  UserSearchResult,
  UsuarioClientePermiso,
} from './contenedor.model';

export interface UpdateContenedorRequest {
  nombre: string;
  celular?: string;
  correo?: string;
}

/** Lo que devuelve el `PATCH`: el eco de los tres campos editables, nada más. */
export type UpdateContenedorResponse = Required<UpdateContenedorRequest>;

/** Lo que devuelve `ingresar/`: el instante que quedó como última conexión. */
export interface IngresarContenedorResponse {
  readonly fecha_ultima_conexion: string;
}

@Injectable({ providedIn: 'root' })
export class ContenedorService extends BaseHttpService {
  // Endpoints en el schema público (/contenedor/, /seguridad/usuario…): sin X-Tenant.
  protected override readonly tenantScoped = false;

  getAccesos(): Observable<ContenedoresResponse> {
    return this.get<ContenedoresResponse>('/contenedor/cliente/lista-usuario/');
  }

  /**
   * Ficha de la empresa. Otro serializer que el de la lista: `id`/`nombre` sin
   * el prefijo del FK, con `celular` y `correo`, sin accesos ni suscripción.
   */
  getContenedor(id: number): Observable<ContenedorDetalle> {
    return this.get<ContenedorDetalle>(`/contenedor/cliente/${id}/`);
  }

  /**
   * Responde 202 con el contenedor en `estado: creando`: la creación sigue en
   * segundo plano y se sigue con `getEstado` hasta que deje de estar `creando`.
   */
  createContenedor(payload: CreateContenedorRequest): Observable<ContenedorDetalle> {
    return this.post<ContenedorDetalle>('/contenedor/cliente/', payload);
  }

  getEstado(id: number): Observable<ContenedorEstadoResponse> {
    return this.get<ContenedorEstadoResponse>(`/contenedor/cliente/${id}/estado/`);
  }

  updateContenedor(
    id: number,
    payload: UpdateContenedorRequest,
  ): Observable<UpdateContenedorResponse> {
    return this.patch<UpdateContenedorResponse>(`/contenedor/cliente/${id}/`, payload);
  }

  /**
   * Marca la última conexión de la empresa con la hora actual. Se llama una vez
   * al entrar, no en cada petición; cualquier miembro puede, y una empresa que
   * no está `listo` responde 409.
   *
   * Sin toast de error: es contabilidad, no algo que la persona pidió. Que
   * falle no debe interrumpir ni ensuciar el ingreso.
   */
  ingresar(id: number): Observable<IngresarContenedorResponse> {
    return this.post<IngresarContenedorResponse>(
      `/contenedor/cliente/${id}/ingresar/`,
      {},
      undefined,
      { errorToast: false },
    );
  }

  /**
   * Carga o reemplaza la imagen de la empresa (multipart, campo `imagen`). El
   * backend acepta JPEG, PNG o WEBP de hasta 5 MB, genera el original y la
   * miniatura en WEBP y responde la ficha con las dos URLs. Solo el propietario.
   */
  subirImagen(id: number, imagen: File): Observable<ContenedorDetalle> {
    return this.postFile<ContenedorDetalle>(
      `/contenedor/cliente/${id}/imagen/`,
      imagen,
      undefined,
      'imagen',
    );
  }

  /** Quita la imagen de la empresa. Quitarla a una que no tiene no es error. */
  quitarImagen(id: number): Observable<ContenedorDetalle> {
    return this.delete<ContenedorDetalle>(`/contenedor/cliente/${id}/imagen/`);
  }

  /**
   * Hace al staff miembro del contenedor como soporte (`is_superuser` y todos los
   * accesos), sin invitación. Solo staff con MFA activo (403 si no); 409 si el
   * contenedor no está `listo` o ya es miembro. Responde la membresía con la
   * forma de `lista-usuario`. No vence: se cierra saliendo de la empresa.
   *
   * `id` es el del cliente (`/contenedor/cliente/administrar/`), no una membresía.
   */
  abrirSoporte(id: number, opts?: RequestOptions): Observable<Contenedor> {
    return this.post<Contenedor>(`/contenedor/cliente/${id}/soporte/`, {}, undefined, opts);
  }

  deleteContenedor(id: number): Observable<unknown> {
    return this.delete(`/contenedor/cliente/${id}/`);
  }

  /**
   * Miembros de un contenedor.
   *
   * `params` viaja tal cual como query params junto al `cliente_id`: es lo que
   * usa Seguridad del ERP para filtrar y buscar **en el backend** en vez de en
   * memoria. Sin `params` el comportamiento es el de siempre (todo el listado).
   */
  getMembers(
    contenedorId: number,
    params?: Record<string, ParamValue>,
    opts?: RequestOptions,
  ): Observable<ContenedorMembersResponse> {
    return this.get<ContenedorMembersResponse>(
      '/seguridad/usuario-cliente/lista-cliente/',
      { cliente_id: contenedorId, ...params },
      opts,
    );
  }

  getPendingInvitations(
    contenedorId: number,
  ): Observable<ContenedorInvitacionesPendientesResponse> {
    return this.get<ContenedorInvitacionesPendientesResponse>(
      `/contenedor/invitacion/pendiente-cliente/?cliente_id=${contenedorId}`,
    );
  }

  sendInvitation(payload: SendInviteRequest): Observable<unknown> {
    return this.post('/contenedor/invitacion/', payload);
  }

  /**
   * Grupos de seguridad disponibles para asignar en la invitación.
   *
   * Los grupos son verticales del schema público: globales, no dependen del
   * contenedor. SUPUESTO pendiente de confirmar con backend: el shape de la
   * respuesta — se tolera tanto un array plano como el envelope paginado de
   * DRF.
   */
  getGrupos(): Observable<readonly GrupoSeguridad[]> {
    return this.get<GrupoSeguridad[] | PaginatedResponse<GrupoSeguridad>>('/seguridad/grupo/').pipe(
      map((r) => (Array.isArray(r) ? r : (r.results ?? []))),
    );
  }

  /**
   * Una página del catálogo de permisos individuales asignables, con filtros
   * **y paginación** resueltos en el backend (`app`, `modelo`, `accion`,
   * `search`, `page` como query params). Devuelve el envelope DRF tal
   * cual: el caller pagina con `count`.
   *
   * Como los grupos, son verticales del schema público: globales, sin
   * `X-Tenant`.
   */
  getPermisos(
    filtros: PermisoCatalogoFiltros = {},
  ): Observable<PaginatedResponse<PermisoSeguridad>> {
    const params: Record<string, ParamValue> = {};
    if (filtros.app) params['app'] = filtros.app;
    if (filtros.modelo) params['modelo'] = filtros.modelo;
    if (filtros.accion) params['accion'] = filtros.accion;
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.page) params['page'] = filtros.page;
    return this.get<PaginatedResponse<PermisoSeguridad>>('/seguridad/permiso/', params);
  }

  /**
   * Membresía + permiso efectivo (grupos y permisos directos) de un usuario.
   *
   * Excepción dentro de este servicio global: este endpoint sí es
   * tenant-scoped (viaja con `X-Tenant`), por eso el override por petición.
   */
  getMemberPermisos(usuarioId: number): Observable<PaginatedResponse<UsuarioClientePermiso>> {
    return this.get<PaginatedResponse<UsuarioClientePermiso>>(
      '/seguridad/usuario-cliente-permiso/',
      { usuario_id: usuarioId },
      { tenantScoped: true },
    );
  }

  /** Asigna un grupo de seguridad al usuario. Tenant-scoped, como el listado. */
  addMemberGrupo(usuarioId: number, grupoId: number): Observable<unknown> {
    return this.post(
      '/seguridad/usuario-cliente-permiso/agregar-grupo/',
      { usuario_id: usuarioId, grupo_id: grupoId },
      undefined,
      { tenantScoped: true },
    );
  }

  /** Quita un grupo de seguridad al usuario. Tenant-scoped, como el listado. */
  removeMemberGrupo(usuarioId: number, grupoId: number): Observable<unknown> {
    return this.post(
      '/seguridad/usuario-cliente-permiso/quitar-grupo/',
      { usuario_id: usuarioId, grupo_id: grupoId },
      undefined,
      { tenantScoped: true },
    );
  }

  /**
   * Asigna un permiso individual al usuario. Tenant-scoped, como el listado.
   * SUPUESTO pendiente de confirmar con backend: el body `{ usuario_id,
   * permiso_id }`, espejo del `{ usuario_id, grupo_id }` de los grupos.
   */
  addMemberPermiso(usuarioId: number, permisoId: number): Observable<unknown> {
    return this.post(
      '/seguridad/usuario-cliente-permiso/agregar-permiso/',
      { usuario_id: usuarioId, permiso_id: permisoId },
      undefined,
      { tenantScoped: true },
    );
  }

  /**
   * Quita un permiso individual al usuario. SUPUESTO pendiente de confirmar
   * con backend: se asume `quitar-permiso/` espejo de `agregar-permiso/`
   * (como el par de grupos).
   */
  removeMemberPermiso(usuarioId: number, permisoId: number): Observable<unknown> {
    return this.post(
      '/seguridad/usuario-cliente-permiso/quitar-permiso/',
      { usuario_id: usuarioId, permiso_id: permisoId },
      undefined,
      { tenantScoped: true },
    );
  }

  /**
   * Borra una membresía: el propietario saca a un miembro, o un miembro sale
   * de la empresa con la suya (el `id` de `lista-usuario`). `opts` deja que la
   * pantalla apague el toast del interceptor cuando avisa el fallo por su cuenta.
   */
  removeMember(membershipId: number, opts?: RequestOptions): Observable<unknown> {
    return this.delete(`/seguridad/usuario-cliente/${membershipId}/`, opts);
  }

  /**
   * Usuarios que matchean el término, para el autocomplete de la invitación.
   *
   * El endpoint responde el envelope paginado de DRF; acá se devuelve solo la
   * página de resultados: el autocomplete muestra las primeras coincidencias y
   * el resto se acota tecleando, no paginando. Se tolera además el array plano
   * por si algún despliegue todavía responde el shape viejo.
   */
  searchUsers(query: string): Observable<readonly UserSearchResult[]> {
    return this.get<UserSearchResult[] | PaginatedResponse<UserSearchResult>>(
      '/seguridad/usuario/seleccionar/',
      { search: query },
    ).pipe(map((r) => (Array.isArray(r) ? r : (r.results ?? []))));
  }
}
