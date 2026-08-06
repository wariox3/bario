import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { finalize } from 'rxjs';
import {
  I18nService,
  TenantService,
  ToastService,
  getInitials,
  type UsuarioClientePermiso,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { UsuarioGruposPanelComponent } from '../../components/usuario-grupos-panel/usuario-grupos-panel.component';
import { UsuarioPermisosPanelComponent } from '../../components/usuario-permisos-panel/usuario-permisos-panel.component';
import { SEGURIDAD_USUARIOS_PATH } from '../../usuarios.constants';
import type { UsuarioRow } from '../../usuarios.model';
import { SeguridadUsuariosService } from '../../usuarios.service';
import { toUsuarioRow } from '../../usuarios.utils';

/**
 * Detalle de un usuario del contenedor.
 *
 * El backend no expone el miembro suelto: se pide la lista del contenedor y se
 * busca el `id` de la URL. Cuesta lo mismo que ya cuesta la lista y evita
 * inventar un endpoint; el día que exista, solo cambia `load()`.
 *
 * La información del miembro va en su propia card; debajo, la card de acceso
 * con pestañas "Grupos" y "Permisos" alimentadas por
 * `/seguridad/usuario-cliente-permiso/` (misma receta de deep-link `?tab=` que
 * Configuración usa con `?seccion=`).
 */
@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [
    ButtonModule,
    TabsModule,
    BreadcrumbComponent,
    UsuarioGruposPanelComponent,
    UsuarioPermisosPanelComponent,
  ],
  templateUrl: './usuario-detail.component.html',
  styleUrl: './usuario-detail.component.scss',
})
export class UsuarioDetailComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** `id` de la membresía (`usuario-cliente`), no del usuario. */
  readonly id = input.required<string>();

  /** Pestaña activa (query-param `?tab=`); por defecto "grupos". */
  readonly tab = input<string>();
  protected readonly activeTab = computed(() => this.tab() || 'grupos');

  protected readonly usuario = signal<UsuarioRow | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly notFound = signal(false);

  /** Fila de usuario-cliente-permiso del miembro; alimenta ambas pestañas. */
  protected readonly permisoRow = signal<UsuarioClientePermiso | null>(null);
  protected readonly isLoadingPermiso = signal(false);

  /** Seguridad → Usuarios → <persona>. La hoja no lleva link (es esta página). */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const usuario = this.usuario();
    return [
      { label: this.t().seguridad.title, routerLink: slug ? ['/t', slug, 'seguridad'] : undefined },
      {
        label: this.t().seguridad.menu.usuarios,
        routerLink: slug ? ['/t', slug, ...SEGURIDAD_USUARIOS_PATH] : undefined,
      },
      { label: usuario ? usuario.usuario_nombre_corto || usuario.usuario_email : '…' },
    ];
  });

  /** Iniciales para el avatar; el backend no expone la foto de otros usuarios. */
  protected readonly initials = computed(() => {
    const usuario = this.usuario();
    return usuario ? getInitials(usuario.usuario_nombre_corto || usuario.usuario_email) : '';
  });

  constructor() {
    // Reacciona al `id` de la URL y a que el contenedor termine de resolverse.
    effect(() => {
      const membershipId = Number(this.id());
      if (Number.isNaN(membershipId) || this.service.clienteId() == null) return;
      this.load(membershipId);
    });
  }

  protected onTabChange(value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: value },
      queryParamsHandling: 'merge',
    });
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...SEGURIDAD_USUARIOS_PATH]);
  }

  private load(membershipId: number): void {
    this.isLoading.set(true);
    this.notFound.set(false);
    const roles = this.t().seguridad.usuarios.roles;
    this.service
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (members) => {
          const member = members.find((m) => m.id === membershipId);
          this.usuario.set(member ? toUsuarioRow(member, roles) : null);
          this.notFound.set(!member);
          if (member) this.loadPermisos(member.usuario_id);
        },
        error: () => {
          this.usuario.set(null);
          this.notFound.set(true);
          const toasts = this.t().seguridad.usuarios.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  /**
   * Grupos y permisos del miembro. Si falla, las pestañas muestran sus empty
   * states (sin toast: el detalle ya cargó y esto es información secundaria).
   */
  private loadPermisos(usuarioId: number): void {
    this.isLoadingPermiso.set(true);
    this.service
      .getPermisos(usuarioId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingPermiso.set(false)),
      )
      .subscribe({
        next: (row) => this.permisoRow.set(row),
        error: () => this.permisoRow.set(null),
      });
  }
}
