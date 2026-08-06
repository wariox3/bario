import { Injectable, computed, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  ContenedorService,
  FileDownloadService,
  TenantService,
  buildFiltros,
  type ContenedorMember,
  type FilterCondition,
  type GrupoSeguridad,
  type UserSearchResult,
} from '@reddoc/core';
import { ContenedorNoResueltoError } from '../../seguridad.errors';
import { SEGURIDAD_USUARIOS_EXPORT_URL } from './usuarios.constants';
import { usuariosQueryParams } from './usuarios.utils';

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
   * Invita a un usuario al contenedor. **Sin rol**: está pendiente de confirmar
   * si el rol viaja en la invitación o se asigna después de aceptarla, así que
   * por ahora no se manda `rol_id` (el backend aplica su default). Los grupos
   * sí viajan (`grupo_ids`), solo cuando se eligió alguno.
   */
  invite(usuarioId: number, grupoIds: readonly number[] = []): Observable<unknown> {
    return this.contenedor.sendInvitation({
      cliente_id: this.requireClienteId(),
      usuario_id: usuarioId,
      ...(grupoIds.length > 0 ? { grupo_ids: grupoIds } : {}),
    });
  }

  updateRol(membershipId: number, rolId: number): Observable<unknown> {
    return this.contenedor.updateMemberRol(membershipId, rolId);
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
