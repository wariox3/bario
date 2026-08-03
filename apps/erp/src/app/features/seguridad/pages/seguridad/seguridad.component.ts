import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { UsuariosListComponent } from '../../components/usuarios-list/usuarios-list.component';

/**
 * Shell de Seguridad del contenedor.
 *
 * Aloja las áreas en pestañas horizontales; la activa viaja en `?seccion=` para
 * deep-link. Cada área es auto-contenida (carga sus propios datos), así que el
 * shell no hace HTTP. Hoy solo hay "Usuarios"; los permisos granulares serán
 * una pestaña hermana sin tocar esta.
 */
@Component({
  selector: 'app-seguridad',
  standalone: true,
  imports: [TabsModule, UsuariosListComponent],
  templateUrl: './seguridad.component.html',
  styleUrl: './seguridad.component.scss',
})
export class SeguridadComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Pestaña activa (query-param `?seccion=`); por defecto "usuarios". */
  readonly seccion = input<string>();
  protected readonly activeSeccion = computed(() => this.seccion() || 'usuarios');

  protected onTabChange(value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seccion: value },
      queryParamsHandling: 'merge',
    });
  }
}
