import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BaseHttpService,
  type ParamValue,
  type RequestOptions,
} from '../services/base-http.service';
import {
  Contenedor,
  ContenedorInvitacionesPendientesResponse,
  ContenedorMember,
  ContenedorMembersResponse,
  ContenedoresResponse,
  CreateContenedorRequest,
  SendInviteRequest,
  UserSearchResult,
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

  removeMember(membershipId: number): Observable<unknown> {
    return this.delete(`/seguridad/usuario-cliente/${membershipId}/`);
  }

  /**
   * Cambia el rol de un miembro dentro del contenedor.
   *
   * SUPUESTO pendiente de confirmar con backend: se asume el `PATCH` estándar
   * del recurso `usuario-cliente` aceptando `rol_id`. Si el backend expone una
   * acción dedicada, solo cambia esta línea.
   */
  updateMemberRol(membershipId: number, rolId: number): Observable<ContenedorMember> {
    return this.patch<ContenedorMember>(`/seguridad/usuario-cliente/${membershipId}/`, {
      rol_id: rolId,
    });
  }

  searchUsers(query: string): Observable<UserSearchResult[]> {
    return this.get<UserSearchResult[]>(
      `/seguridad/usuario/seleccionar/?search=${encodeURIComponent(query)}`,
    );
  }
}
