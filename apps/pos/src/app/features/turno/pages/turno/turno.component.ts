import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';

/** Turno: página en blanco mientras se define su contenido. */
@Component({
  selector: 'app-turno',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './turno.component.html',
})
export class TurnoComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
}
