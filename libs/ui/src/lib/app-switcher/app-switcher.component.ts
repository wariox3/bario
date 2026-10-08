import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { CURRENT_APP, ENVIRONMENT, I18nService, TenantService } from '@reddoc/core';
import type { AppSwitcherTranslationsHost } from './i18n';
import { SWITCHER_APPS } from './app-switcher.constants';

/** Gracia al salir con el mouse antes de cerrar, para no perder el panel al cruzar el gap. */
const CLOSE_DELAY_MS = 150;

/**
 * Switcher de apps del monorepo — va en `app-header__actions`, a la izquierda
 * del user-menu. Cada app lo consume igual; lo único que cambia por app son sus
 * providers: `CURRENT_APP` (para excluirse) y las `<app>Url` del `ENVIRONMENT`
 * (para decidir a quiénes ve).
 *
 * El tenant activo viaja en la URL (`/t/:slug`), no por `localStorage`: cada app
 * corre en su propio origen (puertos distintos en dev, subdominios en prod) y no
 * ve el `LAST_TENANT_KEY` de las demás. Sin el slug en el href, la app destino
 * cae en su `rootRedirectGuard` y entra al último contenedor que *ella* recuerda
 * —otro, casi siempre— en vez de al que el usuario está mirando ahora.
 */
@Component({
  selector: 'lib-app-switcher',
  standalone: true,
  templateUrl: './app-switcher.component.html',
  styleUrl: './app-switcher.component.scss',
})
export class AppSwitcherComponent {
  private readonly env = inject(ENVIRONMENT);
  private readonly currentApp = inject(CURRENT_APP);
  private readonly i18n = inject<I18nService<AppSwitcherTranslationsHost>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly t = this.i18n.t;
  protected readonly open = signal(false);

  private closeTimer?: ReturnType<typeof setTimeout>;

  /** Apps con URL configurada en este entorno, menos la app actual. */
  protected readonly apps = computed(() => {
    const dict = this.t().appSwitcher;
    const slug = this.tenant.currentSlug();
    return SWITCHER_APPS.flatMap((app) => {
      if (app.id === this.currentApp) return [];
      const base = app.url(this.env);
      if (!base) return [];
      // Sin tenant activo (ej: en /contenedores) la app destino resuelve por su cuenta.
      const url = slug ? `${base}/t/${encodeURIComponent(slug)}` : base;
      return [{ id: app.id, icon: app.icon, url, ...dict.apps[app.id] }];
    });
  });

  protected onEnter(): void {
    this.cancelClose();
    this.open.set(true);
  }

  protected onLeave(): void {
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.open.set(false), CLOSE_DELAY_MS);
  }

  /** Click/tap sobre el trigger — abre en touch y teclado, donde no hay hover. */
  protected toggle(): void {
    this.cancelClose();
    this.open.update((o) => !o);
  }

  private cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.open() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }
}
