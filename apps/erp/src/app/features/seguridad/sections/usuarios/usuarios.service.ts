import { Injectable, computed, inject } from '@angular/core';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import {
  ContenedorService,
  FileDownloadService,
  TenantService,
  buildFiltros,
  type ContenedorAccesoFlags,
  type ContenedorMember,
  type FilterCondition,
  type GrupoSeguridad,
  type PaginatedResponse,
  type PermisoCatalogoFiltros,
  type PermisoSeguridad,
  type UserSearchResult,
  type UsuarioClientePermiso,
} from '@reddoc/core';
import { ContenedorNoResueltoError } from '../../seguridad.errors';
import { SEGURIDAD_USUARIOS_EXPORT_URL } from './usuarios.constants';
import { permisoCatalogoKey, usuariosQueryParams } from './usuarios.utils';

/**
 * Operaciones sobre los usuarios del contenedor activo.
 *
 * Es una fachada delgada sobre `ContenedorService` (endpoints del schema
 * público, sin `X-Tenant`): resuelve el `cliente_id` del contenedor activo una
 * sola vez y lo inyecta en cada llamada, para que las páginas no lo anden
 * paseando. No abre endpoints propios ni duplica el servicio de `libs/core`.
 *
 * La búsqueda y los filtros se resuelven **en el backend**, como query params
 * de `lista-cliente/`. La paginación sigue siendo de cliente: ese endpoint
 * devuelve la colección completa.
 */
@Injectable({ providedIn: 'root' })
export class SeguridadUsuariosService {
  private readonly contenedor = inject(ContenedorService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);

  /** `cliente_id` del contenedor activo; `null` mientras no se resolvió. */
  readonly clienteId = computed<number | null>(
    () => this.tenant.currentContenedor()?.cliente_id ?? null,
  );

  /** Cache por consulta del catálogo de permisos (ver `getCatalogoPermisos`). */
  private readonly catalogoPermisosCache = new Map<string, PaginatedResponse<PermisoSeguridad>>();

  /**
   * Miembros del contenedor activo, con la búsqueda y los filtros **resueltos
   * en el backend** (viajan como query params). Sin contenedor todavía, lista
   * vacía.
   */
  list(
    search = '',
    filtros: readonly FilterCondition[] = [],
  ): Observable<readonly ContenedorMember[]> {
    const clienteId = this.clienteId();
    if (clienteId == null) return of([]);
    return this.contenedor
      .getMembers(clienteId, usuariosQueryParams(search, filtros), {
        // Sin toast: la pantalla renderiza el error (un 403 se ve como el panel
        // de "no tienes acceso", no como un aviso que se va solo).
        errorToast: false,
      })
      .pipe(map((response) => response.results ?? []));
  }

  /** Busca usuarios de la plataforma para invitar (mínimo 3 caracteres). */
  searchUsuarios(term: string): Observable<readonly UserSearchResult[]> {
    return this.contenedor.searchUsers(term);
  }

  /** Grupos de seguridad (verticales, globales) para asignar en la invitación. */
  getGrupos(): Observable<readonly GrupoSeguridad[]> {
    return this.contenedor.getGrupos();
  }

  /**
   * Una página del catálogo de permisos individuales (verticales, globales)
   * asignables, con filtros y paginación resueltos en el backend. Se cachea
   * por combinación de filtros + página: es un catálogo estático que solo
   * cambia con un deploy del backend, así que volver a una página ya visitada
   * no repite la petición.
   */
  getCatalogoPermisos(
    filtros: PermisoCatalogoFiltros = {},
  ): Observable<PaginatedResponse<PermisoSeguridad>> {
    const clave = permisoCatalogoKey(filtros);
    const cacheado = this.catalogoPermisosCache.get(clave);
    if (cacheado) return of(cacheado);
    return this.contenedor
      .getPermisos(filtros)
      .pipe(tap((pagina) => this.catalogoPermisosCache.set(clave, pagina)));
  }

  /**
   * Permiso efectivo del miembro (grupos y permisos directos). SUPUESTO
   * pendiente de confirmar con backend: la consulta por `usuario_id` devuelve
   * una sola fila (la fila no trae `cliente_id` para desambiguar), así que se
   * toma la primera.
   */
  getPermisoMiembro(usuarioId: number): Observable<UsuarioClientePermiso | null> {
    return this.contenedor.getMemberPermisos(usuarioId).pipe(map((r) => r.results[0] ?? null));
  }

  /** Asigna un grupo de seguridad al miembro. */
  addGrupo(usuarioId: number, grupoId: number): Observable<unknown> {
    return this.contenedor.addMemberGrupo(usuarioId, grupoId);
  }

  /** Quita un grupo de seguridad al miembro. */
  removeGrupo(usuarioId: number, grupoId: number): Observable<unknown> {
    return this.contenedor.removeMemberGrupo(usuarioId, grupoId);
  }

  /** Asigna un permiso individual al miembro. */
  addPermiso(usuarioId: number, permisoId: number): Observable<unknown> {
    return this.contenedor.addMemberPermiso(usuarioId, permisoId);
  }

  /** Quita un permiso individual al miembro. */
  removePermiso(usuarioId: number, permisoId: number): Observable<unknown> {
    return this.contenedor.removeMemberPermiso(usuarioId, permisoId);
  }

  /**
   * Invita a un usuario al contenedor con lo que entra: sus grupos y sus
   * accesos por módulo.
   *
   * **Sin rol**: el rol no viaja en la invitación, se cambia desde la fila del
   * listado. Los grupos solo viajan cuando se eligió alguno; los accesos viajan
   * con su booleano explícito (incluido `false`) para que el backend no tenga
   * que adivinar qué significa una flag ausente.
   */
  invite(
    usuarioId: number,
    opciones: {
      readonly grupoIds?: readonly number[];
      readonly accesos?: ContenedorAccesoFlags;
    } = {},
  ): Observable<unknown> {
    const grupoIds = opciones.grupoIds ?? [];
    return this.contenedor.sendInvitation({
      cliente_id: this.requireClienteId(),
      usuario_id: usuarioId,
      ...(grupoIds.length > 0 ? { grupo_ids: grupoIds } : {}),
      ...opciones.accesos,
    });
  }

  /**
   * Quita uno o varios miembros. El backend borra de a uno, así que el lote se
   * dispara en paralelo y el caller ve un único resultado; si alguna falla, el
   * `forkJoin` propaga el error y el caller recarga para ver qué quedó.
   */
  remove(membershipIds: readonly number[]): Observable<unknown> {
    if (membershipIds.length === 0) return of(null);
    return forkJoin(membershipIds.map((id) => this.contenedor.removeMember(id)));
  }

  /** Exporta el listado con los mismos filtros activos en pantalla. */
  exportExcel(filters: readonly FilterCondition[]): Observable<void> {
    return this.fileDownload.download(SEGURIDAD_USUARIOS_EXPORT_URL, {
      method: 'POST',
      // Endpoint del schema público: no lleva `X-Tenant`, lleva `cliente_id`.
      tenantScoped: false,
      body: { cliente_id: this.requireClienteId(), filtros: buildFiltros(filters) },
      fallbackFilename: 'usuarios.xlsx',
    });
  }

  private requireClienteId(): number {
    const clienteId = this.clienteId();
    if (clienteId == null) throw new ContenedorNoResueltoError();
    return clienteId;
  }
}
