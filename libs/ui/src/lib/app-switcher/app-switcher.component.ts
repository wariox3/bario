import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { CURRENT_APP, ENVIRONMENT, I18nService } from '@reddoc/core';
import type { AppSwitcherTranslationsHost } from './i18n';
import { SWITCHER_APPS } from './app-switcher.constants';

/** Gracia al salir con el mouse antes de cerrar, para no perder el panel al cruzar el gap. */
const CLOSE_DELAY_MS = 150;

/**
 * Switcher de apps del monorepo — va en `app-header__actions`, a la izquierda
 * del user-menu. Cada app lo consume igual; lo único que cambia por app son sus
 * providers: `CURRENT_APP` (para excluirse) y las `<app>Url` del `ENVIRONMENT`
 * (para decidir a quiénes ve).
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
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly t = this.i18n.t;
  protected readonly open = signal(false);

  private closeTimer?: ReturnType<typeof setTimeout>;

  /** Apps con URL configurada en este entorno, menos la app actual. */
  protected readonly apps = computed(() => {
    const dict = this.t().appSwitcher;
    return SWITCHER_APPS.flatMap((app) => {
      if (app.id === this.currentApp) return [];
      const url = app.url(this.env);
      if (!url) return [];
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
