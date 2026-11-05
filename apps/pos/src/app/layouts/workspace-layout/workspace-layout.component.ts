import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, TenantService } from '@reddoc/core';
import { AppSwitcherComponent } from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { PestanaUnicaService } from '../../core/pestana/pestana-unica.service';
import { PosStorageService } from '../../core/storage/pos-storage.service';
import { UserMenuComponent } from '../../shared/user-menu/user-menu.component';
import { TenantBadgeComponent } from '../tenant-badge/tenant-badge.component';
import { WORKSPACE_MENU, type PosNavItem } from './workspace-menu';

/**
 * Layout del workspace de un tenant en el POS: header con la empresa activa,
 * sidebar con las secciones de la caja y el `router-outlet`.
 *
 * Mismo esqueleto que el workspace de turnos (header, sidebar fijo, drawer en
 * móvil), con un menú plano: el POS no tiene acordeones ni módulos.
 *
 * El sidebar se **colapsa** a una franja de íconos para darle ancho a la caja:
 *  - En **Caja** arranca colapsado cada vez que se entra; expandirlo ahí vale
 *    solo mientras se está en la caja.
 *  - En las demás secciones manda la preferencia de la persona, recordada en
 *    el dispositivo.
 *
 * Además reserva la caja de la empresa para esta pestaña (`PestanaUnicaService`):
 * si otra pestaña ya la tiene, en lugar de las secciones muestra un aviso, y la
 * toma sola cuando la otra se cierra.
 */
@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    DrawerModule,
    TooltipModule,
    UserMenuComponent,
    AppSwitcherComponent,
    TenantBadgeComponent,
  ],
  templateUrl: './workspace-layout.component.html',
  styleUrl: './workspace-layout.component.scss',
})
export class WorkspaceLayoutComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly storage = inject(PosStorageService);
  private readonly pestana = inject(PestanaUnicaService);

  protected readonly t = this.i18n.t;
  protected readonly items = WORKSPACE_MENU;
  protected readonly drawerVisible = signal(false);
  protected readonly estadoPestana = this.pestana.estado;

  /** La ruta actual es la pantalla de venta. */
  private readonly enVender = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => esVender(e.urlAfterRedirects)),
    ),
    { initialValue: esVender(this.router.url) },
  );

  /** Preferencia de la persona fuera de la pantalla de venta, recordada en el dispositivo. */
  private readonly preferenciaColapsado = signal(
    this.storage.leer(CLAVE_SIDEBAR, esBooleano) ?? false,
  );

  /** En la pantalla de venta: la persona lo expandió en esta visita. Se reinicia al volver a entrar. */
  private readonly expandidoEnVender = signal(false);

  protected readonly colapsado = computed(() =>
    this.enVender() ? !this.expandidoEnVender() : this.preferenciaColapsado(),
  );

  constructor() {
    effect(() => {
      const slug = this.tenant.currentSlug();
      if (slug) this.pestana.reclamar(slug);
    });
    inject(DestroyRef).onDestroy(() => this.pestana.soltar());

    // Entrar a vender siempre abre con el sidebar colapsado.
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (esVender(e.urlAfterRedirects)) this.expandidoEnVender.set(false);
      });
  }

  protected alternarSidebar(): void {
    if (this.enVender()) {
      this.expandidoEnVender.update((v) => !v);
      return;
    }
    const siguiente = !this.preferenciaColapsado();
    this.preferenciaColapsado.set(siguiente);
    this.storage.escribir(CLAVE_SIDEBAR, siguiente);
  }

  protected toggleDrawer(): void {
    this.drawerVisible.update((v) => !v);
  }

  /** Path absoluto del item: cuelga directo de `/t/<slug>/`. Sin slug, de la raíz. */
  protected itemPath(item: PosNavItem): string {
    const slug = this.tenant.currentSlug();
    return slug ? `/t/${slug}/${item.path}` : `/${item.path}`;
  }
}

/** Preferencia del sidebar: del dispositivo, no del tenant. */
const CLAVE_SIDEBAR = 'pos:sidebar:colapsado';

function esBooleano(valor: unknown): valor is boolean {
  return typeof valor === 'boolean';
}

/** `/t/<slug>/vender` (con o sin query/fragmento). */
function esVender(url: string): boolean {
  return /^\/t\/[^/]+\/vender(?:[/?#]|$)/.test(url);
}
