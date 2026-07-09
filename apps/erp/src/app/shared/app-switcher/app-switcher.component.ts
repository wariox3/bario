import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { ENVIRONMENT, I18nService } from '@reddoc/core';
import type { AppDict } from '../../i18n';
import { SWITCHER_APPS } from './app-switcher.constants';

/** Gracia al salir con el mouse antes de cerrar, para no perder el panel al cruzar el gap. */
const CLOSE_DELAY_MS = 150;

@Component({
  selector: 'app-app-switcher',
  standalone: true,
  templateUrl: './app-switcher.component.html',
  styleUrl: './app-switcher.component.scss',
})
export class AppSwitcherComponent {
  private readonly env = inject(ENVIRONMENT);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly t = this.i18n.t;
  protected readonly open = signal(false);

  private closeTimer?: ReturnType<typeof setTimeout>;

  /** Solo las apps con URL configurada en este entorno. */
  protected readonly apps = computed(() => {
    const dict = this.t();
    return SWITCHER_APPS.flatMap((app) => {
      const url = app.url(this.env);
      if (!url) return [];
      return [
        {
          id: app.id,
          icon: app.icon,
          url,
          name: app.name(dict),
          description: app.description(dict),
        },
      ];
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
