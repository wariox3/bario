import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize } from 'rxjs';
import {
  FilterStorageService,
  I18nService,
  TenantService,
  ToastService,
  type ContenedorMember,
  type FilterCondition,
} from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { CONTENEDOR_ROL } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { CambiarRolDialogComponent } from '../../components/cambiar-rol-dialog/cambiar-rol-dialog.component';
import { InvitarUsuarioDialogComponent } from '../../components/invitar-usuario-dialog/invitar-usuario-dialog.component';
import {
  SEGURIDAD_USUARIOS_COLUMNS,
  SEGURIDAD_USUARIOS_FILTERS_STORAGE_KEY,
  SEGURIDAD_USUARIOS_FILTER_FIELDS,
  SEGURIDAD_USUARIOS_PATH,
  SEGURIDAD_USUARIOS_PRIMARY_ACTION,
  SEGURIDAD_USUARIOS_ROW_ACTIONS,
  SEGURIDAD_USUARIOS_TRAILING_ACTIONS,
} from '../../usuarios.constants';
import type { UsuarioRow } from '../../usuarios.model';
import { SeguridadUsuariosService } from '../../usuarios.service';
import { toUsuarioRow } from '../../usuarios.utils';

/**
 * Usuarios con acceso al contenedor activo.
 *
 * **La búsqueda y los filtros los resuelve el backend**: cada cambio recarga
 * `lista-cliente/` con la consulta como query params (el toolbar ya emite el
 * término debounced, así que tipear no dispara una petición por tecla).
 *
 * La paginación sí queda en memoria: ese endpoint devuelve la colección
 * completa. Cuando el backend la exponga, se lee `count` de la respuesta y se
 * mandan `page`/`limit`; la UI no se entera.
 *
 * Al propietario no se le ofrece "eliminar": es quien manda en el contenedor.
 */
@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ConfirmDialogModule,
    InvitarUsuarioDialogComponent,
    CambiarRolDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './usuarios-list.component.html',
  // Releva la cadena de alturas del shell hasta la tabla: solo el cuerpo de la
  // tabla scrollea (mismo contrato que las páginas de lista del ERP).
  host: { class: 'flex min-h-0 flex-1 flex-col gap-3' },
})
export class UsuariosListComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly filterStorage = inject(FilterStorageService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly columns = SEGURIDAD_USUARIOS_COLUMNS;
  protected readonly filterFields = SEGURIDAD_USUARIOS_FILTER_FIELDS;
  protected readonly rowActions = SEGURIDAD_USUARIOS_ROW_ACTIONS;
  protected readonly primaryAction = SEGURIDAD_USUARIOS_PRIMARY_ACTION;
  protected readonly trailingActions = SEGURIDAD_USUARIOS_TRAILING_ACTIONS;

  private readonly members = signal<readonly ContenedorMember[]>([]);
  /** Última petición disparada; las respuestas que no la traen se ignoran. */
  private lastRequestId = 0;
  protected readonly isLoading = signal(false);
  protected readonly isExportingExcel = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly searchValue = signal('');
  protected readonly selectedRows = signal<readonly UsuarioRow[]>([]);
  protected readonly activeFilters = signal<readonly FilterCondition[]>(
    this.filterStorage.read(SEGURIDAD_USUARIOS_FILTERS_STORAGE_KEY),
  );
  protected readonly filtersVisible = signal(false);
  protected readonly inviteVisible = signal(false);
  protected readonly rolDialogVisible = signal(false);
  protected readonly usuarioEnEdicion = signal<UsuarioRow | null>(null);

  /** Filas devueltas por el backend, con el rol ya resuelto a texto. */
  private readonly rows = computed<readonly UsuarioRow[]>(() => {
    const roles = this.t().seguridad.usuarios.roles;
    return this.members().map((member) => toUsuarioRow(member, roles));
  });

  protected readonly totalCount = computed(() => this.rows().length);

  protected readonly pageItems = computed<readonly UsuarioRow[]>(() => {
    const start = this.currentPage() * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  /** Seleccionados que sí se pueden quitar (el propietario nunca). */
  protected readonly eliminables = computed(() =>
    this.selectedRows().filter((row) => row.rol_id !== CONTENEDOR_ROL.propietario),
  );

  constructor() {
    // El contenedor puede resolverse después del primer render (reload duro),
    // así que se observa en vez de leerlo una sola vez.
    effect(() => {
      if (this.service.clienteId() != null) this.load();
    });
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  protected onSearch(term: string): void {
    this.searchValue.set(term);
    this.load();
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.filterStorage.write(SEGURIDAD_USUARIOS_FILTERS_STORAGE_KEY, filters);
    this.load();
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.filterStorage.clear(SEGURIDAD_USUARIOS_FILTERS_STORAGE_KEY);
    this.load();
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'invite':
        this.inviteVisible.set(true);
        break;
      case 'export-excel':
        this.exportExcel();
        break;
    }
  }

  protected onRefresh(): void {
    this.load();
  }

  // ── Tabla ─────────────────────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
  }

  protected onSelectionChange(rows: unknown[]): void {
    this.selectedRows.set(rows as UsuarioRow[]);
  }

  protected onRowClick(row: unknown): void {
    this.verDetalle(row as UsuarioRow);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    const usuario = event.row as UsuarioRow;
    switch (event.actionId) {
      case 'view':
        this.verDetalle(usuario);
        break;
      case 'rol':
        this.usuarioEnEdicion.set(usuario);
        this.rolDialogVisible.set(true);
        break;
      case 'delete':
        this.confirmRemove([usuario]);
        break;
    }
  }

  protected removeSelected(): void {
    this.confirmRemove(this.eliminables());
  }

  /** Recarga tras invitar o cambiar un rol. */
  protected onChanged(): void {
    this.load();
  }

  // ── Interno ───────────────────────────────────────────────────────────────

  private verDetalle(usuario: UsuarioRow): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...SEGURIDAD_USUARIOS_PATH, 'detalle', usuario.id]);
  }

  private confirmRemove(usuarios: readonly UsuarioRow[]): void {
    if (usuarios.length === 0) return;
    const dict = this.t().seguridad.usuarios;
    this.confirmation.confirm({
      header: dict.confirms.deleteHeader,
      message:
        usuarios.length === 1
          ? dict.confirms.deleteOne.replace(
              '{usuario}',
              usuarios[0].usuario_nombre_corto || usuarios[0].usuario_email,
            )
          : dict.confirms.deleteMany.replace('{count}', String(usuarios.length)),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(usuarios.map((u) => u.id)),
    });
  }

  private executeRemove(ids: readonly number[]): void {
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .remove(ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(toasts.deleteSuccess.title, toasts.deleteSuccess.desc);
          this.selectedRows.set([]);
          this.load();
        },
        error: () => {
          this.toast.error(toasts.deleteError.title, toasts.deleteError.desc);
          // Un lote puede haber quedado a medias: recargar muestra qué sobrevivió.
          this.load();
        },
      });
  }

  private exportExcel(): void {
    if (this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.service
      .exportExcel(this.activeFilters())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isExportingExcel.set(false)),
      )
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  /**
   * Pide el listado con la consulta actual.
   *
   * La búsqueda y los filtros se leen con `untracked` porque `load()` corre
   * dentro del `effect` que observa el contenedor: sin eso, el efecto se
   * suscribiría a ellos y cada tecleo dispararía **dos** peticiones.
   *
   * Las respuestas viejas se descartan (`requestId`): tipeando rápido, la
   * primera en volver no tiene por qué ser la última pedida.
   */
  private load(): void {
    const requestId = ++this.lastRequestId;
    this.isLoading.set(true);
    this.service
      .list(untracked(this.searchValue), untracked(this.activeFilters))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.lastRequestId) this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: (members) => {
          if (requestId !== this.lastRequestId) return;
          this.members.set(members);
          this.selectedRows.set([]);
          this.currentPage.set(0);
        },
        error: () => {
          if (requestId !== this.lastRequestId) return;
          this.members.set([]);
          const toasts = this.t().seguridad.usuarios.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }
}
