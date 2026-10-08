import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import { EmpresaConfigComponent } from '@erp/features/configuracion/components/empresa-config/empresa-config.component';
import type { AppDict } from '@erp/i18n';

/**
 * Modal de edición de los datos de la empresa.
 *
 * No trae formulario propio: hospeda el `EmpresaConfigComponent` —el mismo que
 * usa el asistente de facturación electrónica— con sus acciones apagadas, y le
 * presta el pie del diálogo. Duplicar acá los diez campos con sus validadores
 * era garantizar que las dos copias se separaran a la primera corrección.
 *
 * El formulario se monta con el modal (`@if (visible())`), así que cada apertura
 * relee del backend y una edición abandonada no deja el borrador colgado.
 */
@Component({
  selector: 'app-empresa-edit-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, EmpresaConfigComponent],
  templateUrl: './empresa-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ':host { display: contents; }',
})
export class EmpresaEditDialogComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);

  /** Se emite tras guardar, para que la ficha vuelva a leer lo que quedó. */
  readonly saved = output<void>();

  private readonly config = viewChild(EmpresaConfigComponent);

  /** Hay un guardado en vuelo (o el formulario todavía no se montó). */
  protected readonly isSaving = () => this.config()?.isSaving() ?? false;

  protected onSubmit(): void {
    this.config()?.guardar();
  }

  protected onSaved(): void {
    this.visible.set(false);
    this.saved.emit();
  }
}
