import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BaseHttpService,
  type ParamValue,
  type RequestOptions,
} from '../../services/base-http.service';
import type { PaginatedResponse } from '../../models/pagination.model';
import { fetchAllPages } from '../../data-list/data/fetch-all-pages';
import {
  Contenedor,
  ContenedorDetalle,
  ContenedorEstadoResponse,
  ContenedorInvitacionesPendientesResponse,
  InvitacionesRecibidasResponse,
  ContenedorMembersResponse,
  ContenedoresResponse,
  CreateContenedorRequest,
  GrupoSeguridad,
  MembresiaContenedor,
  PermisoCatalogoFiltros,
  PermisoSeguridad,
  SendInviteRequest,
  UserSearchResult,
  UsuarioClienteGrupo,
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
   * Membresía del usuario en el contenedor `schemaName`: lo que valida la
   * entrada a `/t/:slug`. Sin toast: quien llama decide qué hacer con el 404.
   */
  getMembresia(schemaName: string): Observable<MembresiaContenedor> {
    return this.get<MembresiaContenedor>(
      '/seguridad/usuario-cliente/usuario/',
      { schema_name: schemaName },
      { errorToast: false },
    );
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

  /** Invitaciones pendientes que recibió el usuario autenticado. */
  getInvitacionesRecibidas(opts?: RequestOptions): Observable<InvitacionesRecibidasResponse> {
    return this.get<InvitacionesRecibidasResponse>(
      '/contenedor/invitacion/pendiente-usuario/',
      undefined,
      opts,
    );
  }

  /** Acepta una invitación recibida: el usuario pasa a ser miembro (409 si ya lo era). */
  aceptarInvitacion(id: number, opts?: RequestOptions): Observable<unknown> {
    return this.post(`/contenedor/invitacion/${id}/aceptar/`, {}, undefined, opts);
  }

  /** Rechaza una invitación recibida. No se deshace: hace falta otra invitación. */
  rechazarInvitacion(id: number, opts?: RequestOptions): Observable<unknown> {
    return this.post(`/contenedor/invitacion/${id}/rechazar/`, {}, undefined, opts);
  }

  /**
   * Grupos de seguridad disponibles para asignar en la invitación.
   *
   * Los grupos son verticales del schema público: globales, no dependen del
   * contenedor. El endpoint pagina (`PaginatedSegGrupoList`), así que se
   * recorren todas las páginas: si no, el grupo 26 en adelante no aparecería.
   */
  getGrupos(): Observable<readonly GrupoSeguridad[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<GrupoSeguridad>>(`/seguridad/grupo/?page=${page}`),
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
   * Grupos de una membresía (`usuario_cliente_id` = `id` de `lista-usuario`,
   * no el `usuario_id`). Schema público: sin `X-Tenant`. Pagina de a 25, así
   * que se recorren todas las páginas.
   */
  getMemberGrupos(usuarioClienteId: number): Observable<readonly UsuarioClienteGrupo[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<UsuarioClienteGrupo>>('/seguridad/usuario-cliente-grupo/', {
        usuario_cliente_id: usuarioClienteId,
        page,
      }),
    );
  }

  /**
   * Asigna un grupo a la membresía. `heredarPermisos` decide el nivel: con él
   * tiene todos los permisos del grupo; sin él, solo el módulo en el menú. Se
   * manda siempre explícito (no hay PUT: cambiarlo es quitar y volver a agregar).
   */
  addMemberGrupo(
    usuarioClienteId: number,
    grupoId: number,
    heredarPermisos: boolean,
  ): Observable<UsuarioClienteGrupo> {
    return this.post<UsuarioClienteGrupo>('/seguridad/usuario-cliente-grupo/', {
      usuario_cliente: usuarioClienteId,
      grupo: grupoId,
      heredar_permisos: heredarPermisos,
    });
  }

  /** Quita un grupo borrando su fila (`id` de `usuario-cliente-grupo`). */
  removeMemberGrupo(asignacionId: number): Observable<unknown> {
    return this.delete(`/seguridad/usuario-cliente-grupo/${asignacionId}/`);
  }

  /**
   * Permisos personalizados de una membresía. Schema público, paginado como
   * los grupos.
   */
  getMemberPermisos(usuarioClienteId: number): Observable<readonly UsuarioClientePermiso[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<UsuarioClientePermiso>>('/seguridad/usuario-cliente-permiso/', {
        usuario_cliente_id: usuarioClienteId,
        page,
      }),
    );
  }

  /** Asigna un permiso personalizado a la membresía. */
  addMemberPermiso(usuarioClienteId: number, permisoId: number): Observable<UsuarioClientePermiso> {
    return this.post<UsuarioClientePermiso>('/seguridad/usuario-cliente-permiso/', {
      usuario_cliente: usuarioClienteId,
      permiso: permisoId,
    });
  }

  /** Quita un permiso personalizado borrando su fila (`id` de `usuario-cliente-permiso`). */
  removeMemberPermiso(asignacionId: number): Observable<unknown> {
    return this.delete(`/seguridad/usuario-cliente-permiso/${asignacionId}/`);
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
