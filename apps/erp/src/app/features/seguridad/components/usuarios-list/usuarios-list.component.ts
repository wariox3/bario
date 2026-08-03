import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  ContenedorService,
  I18nService,
  TenantService,
  ToastService,
  type ContenedorMember,
} from '@reddoc/core';
import { DataTableComponent, type PageChangeEvent } from '@reddoc/feature-base';
import { CONTENEDOR_ROL } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { ROL_LABEL_KEY_BY_ID, SEGURIDAD_USUARIOS_COLUMNS } from '../../seguridad.constants';

/** Fila de la tabla: el miembro con el rol ya resuelto a texto. */
type UsuarioRow = ContenedorMember & { readonly rol_nombre: string };

/**
 * Usuarios del contenedor activo.
 *
 * Solo lectura: invitar y quitar miembros siguen viviendo en el diálogo de
 * `/contenedores`, para no tener la misma acción en dos lugares. Reusa
 * `ContenedorService` (endpoint del schema público, sin `X-Tenant`) en vez de
 * abrir un servicio propio en el ERP.
 *
 * El endpoint devuelve la lista completa de una, así que la paginación se
 * resuelve en cliente troceando el array.
 */
@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [DataTableComponent],
  templateUrl: './usuarios-list.component.html',
  // Releva la cadena de alturas del panel de tabs hasta la tabla: solo el cuerpo
  // de la tabla scrollea (mismo contrato que las páginas de lista).
  host: { class: 'flex min-h-0 flex-1 flex-col gap-3' },
})
export class UsuariosListComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly columns = SEGURIDAD_USUARIOS_COLUMNS;

  private readonly members = signal<readonly ContenedorMember[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);

  /** Rol legible: el nombre del backend, con respaldo por id si viniera vacío. */
  private readonly rows = computed<readonly UsuarioRow[]>(() => {
    const roles = this.t().seguridad.usuarios.roles;
    return this.members().map((m) => ({
      ...m,
      rol_nombre:
        m.rol_nombre?.trim() ||
        roles[ROL_LABEL_KEY_BY_ID[m.rol_id ?? CONTENEDOR_ROL.usuario] ?? 'usuario'],
    }));
  });

  protected readonly totalCount = computed(() => this.rows().length);

  protected readonly pageItems = computed<readonly UsuarioRow[]>(() => {
    const start = this.currentPage() * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  constructor() {
    // El slug puede resolverse después del primer render (reload duro), así que
    // se observa el contenedor activo en lugar de leerlo una sola vez.
    effect(() => {
      const clienteId = this.tenant.currentContenedor()?.cliente_id;
      if (clienteId != null) this.loadMembers(clienteId);
    });
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
  }

  private loadMembers(clienteId: number): void {
    this.isLoading.set(true);
    this.contenedorService
      .getMembers(clienteId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.members.set(response.results ?? []);
          this.currentPage.set(0);
        },
        error: () => {
          this.members.set([]);
          const toasts = this.t().seguridad.usuarios.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }
}
