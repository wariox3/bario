import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Aviso "Cambios sin guardar" junto al botón de guardar de un documento en edición.
 *
 * En edición la cabecera y las líneas se escriben en peticiones distintas, pero un
 * solo "Guardar" confirma todo. Este aviso dice que hay algo por confirmar —la
 * cabecera tocada o líneas agregadas, editadas o quitadas— con el mismo criterio
 * que el guard de salida (`hayCambiosSinGuardar`). El form decide cuándo mostrarlo:
 *
 * ```html
 * @if (hayCambios()) { <app-cambios-sin-guardar /> }
 * ```
 */
@Component({
  selector: 'app-cambios-sin-guardar',
  standalone: true,
  host: { role: 'status' },
  template: `
    <span class="inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-amber-600">
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
      {{ t().entities.comercialDetalle.leaveHeader }}
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiosSinGuardarComponent {
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;
}
