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
  telefono?: string;
  correo?: string;
}

@Injectable({ providedIn: 'root' })
export class ContenedorService extends BaseHttpService {
  // Endpoints en el schema público (/contenedor/, /seguridad/usuario…): sin X-Tenant.
  protected override readonly tenantScoped = false;

  getAccesos(): Observable<ContenedoresResponse> {
    return this.get<ContenedoresResponse>('/contenedor/cliente/lista-usuario/');
  }

  getContenedor(id: number): Observable<Contenedor> {
    return this.get<Contenedor & { id?: number }>(`/contenedor/cliente/${id}/`).pipe(
      map((r) => ({ ...r, cliente_id: r.cliente_id ?? r.id ?? id })),
    );
  }

  createContenedor(payload: CreateContenedorRequest): Observable<unknown> {
    return this.post('/contenedor/cliente/', payload);
  }

  updateContenedor(id: number, payload: UpdateContenedorRequest): Observable<Contenedor> {
    return this.patch<Contenedor>(`/contenedor/cliente/${id}/`, payload);
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
   * `search`, `page`, `limit` como query params). Devuelve el envelope DRF tal
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
    if (filtros.limit) params['limit'] = filtros.limit;
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

  removeMember(membershipId: number): Observable<unknown> {
    return this.delete(`/seguridad/usuario-cliente/${membershipId}/`);
  }

  searchUsers(query: string): Observable<UserSearchResult[]> {
    return this.get<UserSearchResult[]>(
      `/seguridad/usuario/seleccionar/?search=${encodeURIComponent(query)}`,
    );
  }
}
