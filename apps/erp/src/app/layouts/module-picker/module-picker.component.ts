import { Component, computed, inject, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { VisibleModulesStore } from '../module-bar/visible-modules.store';

/**
 * Selector de módulo del drawer móvil: la contraparte del topbar cuando no hay
 * ancho para él.
 *
 * Arriba nombra el módulo actual («¿dónde estoy?»); al tocarlo despliega la
 * grilla de módulos. Sin módulo activo (dashboard, empresa…) la grilla está
 * siempre abierta: es la única salida de esas pantallas.
 *
 * Elegir un módulo navega y repliega la grilla, pero el drawer sigue abierto:
 * lo siguiente casi siempre es elegir una sección del módulo nuevo.
 */
@Component({
  selector: 'app-module-picker',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './module-picker.component.html',
  styleUrl: './module-picker.component.scss',
})
export class ModulePickerComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly store = inject(VisibleModulesStore);

  protected readonly t = this.i18n.t;
  protected readonly modules = this.store.modules;
  protected readonly active = this.store.active;

  /** Grilla desplegada. El layout la repliega al abrir el drawer. */
  readonly open = model(false);

  protected readonly showGrid = computed(() => this.open() || !this.active());
}
