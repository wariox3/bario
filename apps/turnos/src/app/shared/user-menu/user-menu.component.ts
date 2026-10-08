import { Component, ViewChild, computed, effect, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ENVIRONMENT, I18nService, TenantService } from '@reddoc/core';
import { LanguageToggleComponent, UserAvatarComponent } from '@reddoc/ui';
import { AuthService } from '../../features/auth/services/auth.service';
import type { AppDict } from '@turnos/i18n';

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

  items: MenuItem[] = [];

  constructor() {
    effect(() => {
      const labels = this.t().layout.userMenu;
      const onContainers = this.currentUrl().startsWith('/contenedores');
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
