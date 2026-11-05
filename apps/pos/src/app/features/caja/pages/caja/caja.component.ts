import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';

/** Caja: página en blanco mientras se define su contenido. */
@Component({
  selector: 'app-caja',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './caja.component.html',
})
export class CajaComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
}
