import { Injectable, computed, inject } from '@angular/core';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import {
  ContenedorService,
  FileDownloadService,
  TenantService,
  buildFiltros,
  type FilterCondition,
  type GrupoSeguridad,
  type PaginatedResponse,
  type PermisoCatalogoFiltros,
  type PermisoSeguridad,
  type UserSearchResult,
  type UsuarioClienteGrupo,
  type UsuarioClientePermiso,
} from '@reddoc/core';
import { ContenedorNoResueltoError } from '../../seguridad.errors';
import { SEGURIDAD_USUARIOS_EXPORT_URL } from './usuarios.constants';
import {
  conRol,
  permisoCatalogoKey,
  usuariosQueryParams,
  type UsuarioFila,
} from './usuarios.utils';

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
  list(search = '', filtros: readonly FilterCondition[] = []): Observable<readonly UsuarioFila[]> {
    const clienteId = this.clienteId();
    if (clienteId == null) return of([]);
    return this.contenedor
      .getMembers(clienteId, usuariosQueryParams(search, filtros), {
        // Sin toast: la pantalla renderiza el error (un 403 se ve como el panel
        // de "no tienes acceso", no como un aviso que se va solo).
        errorToast: false,
      })
      .pipe(map((response) => (response.results ?? []).map(conRol)));
  }

  /**
   * Marca o desmarca administrador. Sin toast del interceptor: la ficha avisa
   * el resultado con su propio texto.
   */
  setAdministrador(membershipId: number, administrador: boolean): Observable<unknown> {
    return this.contenedor.setAdministrador(membershipId, administrador, { errorToast: false });
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

  /** Grupos de la membresía (`id` de `lista-usuario`, no el `usuario_id`). */
  getGruposMiembro(usuarioClienteId: number): Observable<readonly UsuarioClienteGrupo[]> {
    return this.contenedor.getMemberGrupos(usuarioClienteId);
  }

  /** Permisos personalizados de la membresía. */
  getPermisosMiembro(usuarioClienteId: number): Observable<readonly UsuarioClientePermiso[]> {
    return this.contenedor.getMemberPermisos(usuarioClienteId);
  }

  /**
   * Asigna un grupo a la membresía con su nivel (`heredarPermisos`); devuelve
   * la fila creada (su `id` sirve para quitarlo).
   */
  addGrupo(
    usuarioClienteId: number,
    grupoId: number,
    heredarPermisos: boolean,
  ): Observable<UsuarioClienteGrupo> {
    return this.contenedor.addMemberGrupo(usuarioClienteId, grupoId, heredarPermisos);
  }

  /** Quita un grupo por el `id` de su fila. */
  removeGrupo(asignacionId: number): Observable<unknown> {
    return this.contenedor.removeMemberGrupo(asignacionId);
  }

  /** Asigna un permiso a la membresía; devuelve la fila creada. */
  addPermiso(usuarioClienteId: number, permisoId: number): Observable<UsuarioClientePermiso> {
    return this.contenedor.addMemberPermiso(usuarioClienteId, permisoId);
  }

  /** Quita un permiso por el `id` de su fila. */
  removePermiso(asignacionId: number): Observable<unknown> {
    return this.contenedor.removeMemberPermiso(asignacionId);
  }

  /**
   * Invita a un usuario al contenedor con lo que entra: sus grupos y sus
   * accesos por módulo.
   *
   * **Sin rol**: el rol no viaja en la invitación, se cambia desde la fila del
   * listado. Los grupos solo viajan cuando se eligió alguno.
   */
  invite(usuarioId: number, grupoIds: readonly number[] = []): Observable<unknown> {
    return this.contenedor.sendInvitation({
      cliente_id: this.requireClienteId(),
      usuario_id: usuarioId,
      ...(grupoIds.length > 0 ? { grupo_ids: grupoIds } : {}),
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
