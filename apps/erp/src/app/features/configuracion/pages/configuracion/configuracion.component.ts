import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { GeneralConfigComponent } from '../../components/general-config/general-config.component';
import { HumanoConfigComponent } from '../../components/humano-config/humano-config.component';

/**
 * Shell de Configuración de la empresa.
 *
 * Aloja las áreas en pestañas horizontales; la activa viaja en `?seccion=` para
 * deep-link. Cada área es auto-contenida (lee y guarda solo sus campos), así que
 * el shell no carga datos. Pestañas: General (UVT) y Humano.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [TabsModule, GeneralConfigComponent, HumanoConfigComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
  // Ancho acotado a propósito: son formularios, no tablas. Las listas del ERP
  // van a todo el ancho; esta página se lee mejor en una columna de 1200px.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class ConfiguracionComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Pestaña activa (query-param `?seccion=`); por defecto "general". */
  readonly seccion = input<string>();
  protected readonly activeSeccion = computed(() => this.seccion() || 'general');

  protected onTabChange(value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: value },
      queryParamsHandling: 'merge',
    });
  }
}
