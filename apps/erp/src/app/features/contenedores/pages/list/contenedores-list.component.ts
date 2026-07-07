import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject, startWith, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
  Contenedor,
  ContenedorService,
  ENVIRONMENT,
  getInitials,
  I18nService,
  TenantService,
} from '@reddoc/core';
import { AuthService } from '../../../auth/services/auth.service';
import { isSuscripcionExpired } from '../../utils/contenedor-suscripcion.utils';
import { ContenedoresCreateDialogComponent } from '../../components/create-dialog/contenedores-create-dialog.component';
import { ContenedoresDeleteDialogComponent } from '../../components/delete-dialog/contenedores-delete-dialog.component';
import { ContenedoresInviteDialogComponent } from '../../components/invite-dialog/contenedores-invite-dialog.component';
import { ContenedorRowItemComponent } from '../../components/contenedor-row-item/contenedor-row-item.component';
import { ContenedorCardItemComponent } from '../../components/contenedor-card-item/contenedor-card-item.component';
import { ROUTE_PATHS } from '../../../../core/constants/route-paths.constants';
import type { AppDict } from '../../../../i18n';

@Component({
  selector: 'app-contenedores-list',
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
  private readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly tenant = inject(TenantService);
  private readonly env = inject(ENVIRONMENT);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

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
    this.router.navigateByUrl(ROUTE_PATHS.tenant.dashboard(item.schema_name));
  }

  renewContenedor(suscripcionId?: number): void {
    const base = this.env.cuentaUrl;
    if (!base) return;
    const path = suscripcionId ? `/suscripciones/planes/${suscripcionId}` : '/suscripciones';
    window.open(`${base}${path}`, '_blank', 'noopener');
  }

  openRowMenu(event: Event, item: Contenedor): void {
    event.stopPropagation();
    const labels = this.t().contenedores.list.actions;
    this.rowMenuItems = [
      {
        label: labels.invite,
        icon: 'pi pi-user-plus',
        command: () => this.inviteContenedor(item),
      },
      {
        label: labels.edit,
        icon: 'pi pi-pencil',
        command: () => this.editContenedor(item),
      },
      {
        label: labels.updateSubscription,
        icon: 'pi pi-credit-card',
        command: () => this.renewContenedor(item.suscripcion_id),
      },
      { separator: true },
      {
        label: labels.delete,
        icon: 'pi pi-trash',
        styleClass: 'cl-row-menu__danger',
        command: () => this.deleteContenedor(item),
      },
    ];
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
