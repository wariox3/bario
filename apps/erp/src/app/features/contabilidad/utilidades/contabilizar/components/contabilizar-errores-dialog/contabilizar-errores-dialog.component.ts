import { Component, inject, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Muestra por qué el backend no contabilizó: su `detail` (que ya nombra el
 * documento) y debajo cada motivo de `errores`.
 */
@Component({
  selector: 'app-contabilizar-errores-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './contabilizar-errores-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class ContabilizarErroresDialogComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  readonly detail = input<string | null>(null);
  readonly mensajes = input<readonly string[]>([]);
}
