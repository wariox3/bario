import { Component, ViewChild, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ENVIRONMENT, I18nService, TenantService } from '@reddoc/core';
import { LanguageToggleComponent, UserAvatarComponent } from '@reddoc/ui';
import { PermissionsService } from '@erp/core/permissions';
import { AuthService } from '../../features/auth/services/auth.service';
import type { AppDict } from '../../i18n';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [MenuModule, LanguageToggleComponent, UserAvatarComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly env = inject(ENVIRONMENT);
  private readonly tenant = inject(TenantService);
  private readonly permissions = inject(PermissionsService);
  private readonly router = inject(Router);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly t = this.i18n.t;

  @ViewChild('menu') menu!: Menu;

  readonly displayName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return '';
    return user.nombre_corto || user.email;
  });

  readonly email = computed(() => this.authService.currentUser()?.email ?? '');

  /**
   * Administrar accesos es cosa de propietario y administrador. La regla vive en
   * `PermissionsService` porque también la aplica el guard de la ruta: el menú y
   * la puerta tienen que decidir con el mismo criterio.
   */
  readonly canManageSecurity = this.permissions.isContenedorAdmin;

  items: MenuItem[] = [];

  constructor() {
    effect(() => {
      const labels = this.t().layout.userMenu;
      const onContainers = this.currentUrl().startsWith('/contenedores');

      // Acciones sobre el contenedor activo. En la lista de contenedores no hay
      // tenant al que llevarlas, así que el grupo entero desaparece en vez de
      // ofrecer entradas que no navegan a ningún lado.
      const tenantItems: MenuItem[] = onContainers
        ? []
        : [
            ...(this.canManageSecurity()
              ? [
                  {
                    label: labels.security,
                    icon: 'pi pi-shield',
                    command: () => {
                      const slug = this.tenant.currentSlug();
                      if (slug) this.router.navigate(['/t', slug, 'seguridad']);
                    },
                  },
                ]
              : []),
            {
              label: labels.settings,
              icon: 'pi pi-cog',
              command: () => {
                const slug = this.tenant.currentSlug();
                if (slug) this.router.navigate(['/t', slug, 'configuracion']);
              },
            },
          ];

      this.items = [
        {
          label: labels.manageAccount,
          icon: 'pi pi-user',
          url: this.env.cuentaUrl,
          target: '_blank',
        },
        ...(!onContainers
          ? [
              {
                label: labels.myContainers,
                icon: 'pi pi-th-large',
                command: () => this.router.navigate(['/contenedores']),
              },
            ]
          : []),
        { separator: true },
        // El separador del grupo viaja con él: sin entradas, no se dibuja.
        ...(tenantItems.length > 0 ? [...tenantItems, { separator: true }] : []),
        {
          label: labels.logout,
          icon: 'pi pi-sign-out',
          command: () => {
            this.tenant.clear();
            this.authService.logout();
          },
        },
      ];
    });
  }

  toggle(event: Event): void {
    this.menu.toggle(event);
  }
}
