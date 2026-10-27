import { Component, inject, input, model } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/** Un documento que no se contabilizó, ya con lo necesario para reconocerlo. */
export interface ContabilizarErrorFila {
  readonly documentoId: number;
  readonly documentoTipo: string | null;
  readonly mensaje: string;
}

/**
 * Lista los documentos que el backend rechazó al contabilizar, uno por fila con
 * su motivo. El tipo sale de la selección que se mandó: el backend solo
 * devuelve el id, y no se piden datos extra para pintarlo.
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
  readonly errores = input<readonly ContabilizarErrorFila[]>([]);
}
