import { Component, DestroyRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, startWith, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
  AUTH_SERVICE,
  Contenedor,
  ContenedorService,
  ENVIRONMENT,
  getInitials,
  I18nService,
  TENANT_ROUTES,
  TenantService,
} from '@reddoc/core';
import { isSuscripcionExpired } from '../../utils/contenedor-suscripcion.utils';
import { ContenedoresCreateDialogComponent } from '../../components/create-dialog/contenedores-create-dialog.component';
import { ContenedoresDeleteDialogComponent } from '../../components/delete-dialog/contenedores-delete-dialog.component';
import { ContenedoresInviteDialogComponent } from '../../components/invite-dialog/contenedores-invite-dialog.component';
import { ContenedorRowItemComponent } from '../../components/contenedor-row-item/contenedor-row-item.component';
import { ContenedorCardItemComponent } from '../../components/contenedor-card-item/contenedor-card-item.component';
import { CONTENEDORES_CAPABILITIES_FULL } from '../../contenedores.capabilities';
import type { ContenedoresCapabilities } from '../../contenedores.capabilities';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedores-list',
  standalone: true,
  imports: [
    ContenedoresCreateDialogComponent,
    ContenedoresDeleteDialogComponent,
    ContenedoresInviteDialogComponent,
    ContenedorRowItemComponent,
    ContenedorCardItemComponent,
    MenuModule,
    ButtonModule,
  ],
  templateUrl: './contenedores-list.component.html',
  styleUrl: './contenedores-list.component.scss',
})
export class ContenedoresListComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AUTH_SERVICE);
  protected readonly router = inject(Router);
  private readonly tenant = inject(TenantService);
  private readonly tenantRoutes = inject(TENANT_ROUTES);
  private readonly env = inject(ENVIRONMENT);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  /**
   * Acciones habilitadas. Cada app la pasa por `data` de su ruta de
   * contenedores; `withComponentInputBinding()` la ata a este input.
   */
  readonly capabilities = input<ContenedoresCapabilities>(CONTENEDORES_CAPABILITIES_FULL);

  /** El menú de fila solo se dibuja si hay al menos una acción adentro. */
  readonly hasRowActions = computed(() => {
    const caps = this.capabilities();
    return caps.invite || caps.edit || caps.subscription || caps.delete;
  });

  readonly showCreate = signal(false);
  readonly showEdit = signal(false);
  readonly showDelete = signal(false);
  readonly showInvite = signal(false);
  readonly contenedorToEdit = signal<Contenedor | null>(null);
  readonly contenedorToDelete = signal<Contenedor | null>(null);
  readonly contenedorToInvite = signal<Contenedor | null>(null);

  readonly viewMode = signal<'list' | 'grid'>('list');

  private readonly reload$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;

  readonly response = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() => this.contenedorService.getAccesos()),
    ),
  );

  readonly isLoading = computed(() => this.response() === undefined);

  readonly contenedores = computed(() => this.response()?.results ?? []);

  readonly searchQuery = signal('');

  readonly filteredContenedores = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.contenedores();
    return this.contenedores().filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.schema_name.toLowerCase().includes(q) ||
        c.dominio.toLowerCase().includes(q),
    );
  });

  readonly counts = computed(() => {
    const all = this.contenedores();
    return { total: all.length, active: all.filter((c) => c.activo).length };
  });

  readonly summaryText = computed(() => {
    const { total, active } = this.counts();
    const labels = this.t().contenedores.list.summary;
    const cWord = total === 1 ? labels.containers.one : labels.containers.other;
    const aWord = active === 1 ? labels.active.one : labels.active.other;
    return `${total} ${cWord} · ${active} ${aWord}`;
  });

  readonly skeletonItems = Array.from({ length: 5 });

  @ViewChild('rowMenu') private rowMenu!: Menu;
  protected rowMenuItems: MenuItem[] = [];

  getAvatarLabel(nombre: string): string {
    return getInitials(nombre);
  }

  enterContenedor(item: Contenedor): void {
    if (isSuscripcionExpired(item.suscripcion_fecha_fin)) {
      if (item.rol_id === 1) this.renewContenedor(item.suscripcion_id);
      return;
    }
    this.tenant.setCurrent(item);
    this.router.navigateByUrl(this.tenantRoutes.tenantHome(item.schema_name));
  }

  renewContenedor(suscripcionId?: number): void {
    if (!this.capabilities().subscription) return;
    const base = this.env.cuentaUrl;
    if (!base) return;
    const path = suscripcionId ? `/suscripciones/planes/${suscripcionId}` : '/suscripciones';
    window.open(`${base}${path}`, '_blank', 'noopener');
  }

  openRowMenu(event: Event, item: Contenedor): void {
    event.stopPropagation();
    const caps = this.capabilities();
    const labels = this.t().contenedores.list.actions;
    const items: MenuItem[] = [];

    if (caps.invite) {
      items.push({
        label: labels.invite,
        icon: 'pi pi-user-plus',
        command: () => this.inviteContenedor(item),
      });
    }
    if (caps.edit) {
      items.push({
        label: labels.edit,
        icon: 'pi pi-pencil',
        command: () => this.editContenedor(item),
      });
    }
    if (caps.subscription) {
      items.push({
        label: labels.updateSubscription,
        icon: 'pi pi-credit-card',
        command: () => this.renewContenedor(item.suscripcion_id),
      });
    }
    if (caps.delete) {
      if (items.length) items.push({ separator: true });
      items.push({
        label: labels.delete,
        icon: 'pi pi-trash',
        styleClass: 'cl-row-menu__danger',
        command: () => this.deleteContenedor(item),
      });
    }

    this.rowMenuItems = items;
    this.rowMenu.toggle(event);
  }

  inviteContenedor(item: Contenedor): void {
    this.contenedorToInvite.set(item);
    this.showInvite.set(true);
  }

  onInviteClose(visible: boolean): void {
    this.showInvite.set(visible);
    if (!visible) this.contenedorToInvite.set(null);
  }

  editContenedor(item: Contenedor): void {
    this.contenedorService
      .getContenedor(item.cliente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contenedor) => {
        this.contenedorToEdit.set(contenedor);
        this.showEdit.set(true);
      });
  }

  deleteContenedor(item: Contenedor): void {
    this.contenedorToDelete.set(item);
    this.showDelete.set(true);
  }

  onContenedorUpdated(): void {
    this.showEdit.set(false);
    this.contenedorToEdit.set(null);
    this.reload$.next();
  }

  onContenedorDeleted(): void {
    this.showDelete.set(false);
    this.contenedorToDelete.set(null);
    this.reload$.next();
  }

  onContenedorCreated(): void {
    this.showCreate.set(false);
    this.reload$.next();
  }
}
