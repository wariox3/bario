import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { splitModules } from './split-modules';
import { VisibleModulesStore } from './visible-modules.store';

/**
 * Topbar de módulos del ERP.
 *
 * Vive en el header del `WorkspaceLayout`. Renderiza un link por cada módulo
 * habilitado para el tenant activo (`VisibleModulesStore`) y marca como activo
 * el que está en `ActiveModuleStore`.
 *
 * Cuando no caben todos, los que sobran van a un menú «Más» (priority+). Las
 * medidas salen de una copia invisible de la barra (`#ghost`) con todos los
 * módulos, así el reparto no depende de lo que esté pintado en ese momento.
 *
 * Cada link apunta a `/t/<slug>/<moduleId>`; el resolver de ese módulo y/o
 * su `''` redirect llevan al destino real (master/documento por defecto o
 * placeholder).
 */
@Component({
  selector: 'app-module-bar',
  standalone: true,
  imports: [RouterLink, MenuModule],
  templateUrl: './module-bar.component.html',
  styleUrl: './module-bar.component.scss',
})
export class ModuleBarComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly store = inject(VisibleModulesStore);

  protected readonly t = this.i18n.t;
  protected readonly modules = this.store.modules;

  private readonly ghost = viewChild<ElementRef<HTMLElement>>('ghost');

  private readonly available = signal(0);
  private readonly itemWidths = signal<readonly number[]>([]);
  private readonly moreWidth = signal(0);
  private readonly gap = signal(0);

  protected readonly split = computed(() =>
    splitModules(this.modules(), this.itemWidths(), this.moreWidth(), this.gap(), this.available()),
  );

  protected readonly overflowItems = computed<MenuItem[]>(() =>
    this.split().overflow.map((mod) => ({
      label: mod.label,
      icon: mod.iconClass,
      routerLink: mod.targetPath,
    })),
  );

  constructor() {
    const observer = new ResizeObserver(() => this.measure());
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());

    // La copia se re-mide sola cuando cambia de ancho (idioma, módulos del
    // plan, el activo que pasa a negrita); el observer sigue al nodo vigente.
    effect((onCleanup) => {
      const ghost = this.ghost()?.nativeElement;
      if (!ghost) return;
      observer.observe(ghost);
      onCleanup(() => observer.unobserve(ghost));
    });

    afterNextRender(() => this.measure());
  }

  private measure(): void {
    this.available.set(this.host.nativeElement.clientWidth);
    const ghost = this.ghost()?.nativeElement;
    if (!ghost) return;
    const items = Array.from(ghost.querySelectorAll<HTMLElement>('[data-module]'));
    this.itemWidths.set(items.map((el) => el.getBoundingClientRect().width));
    this.moreWidth.set(ghost.querySelector('[data-more]')?.getBoundingClientRect().width ?? 0);
    this.gap.set(parseFloat(getComputedStyle(ghost).columnGap) || 0);
  }
}
