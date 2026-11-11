import { Component, inject, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { Contenedor, I18nService } from '@reddoc/core';
import { ContenedorTransferFormComponent } from './contenedor-transfer-form.component';
import type { ContenedoresTranslationsHost } from '../../i18n';

/**
 * Transferir la propiedad del contenedor. Solo lo abre el propietario (el menú
 * de la fila no lo ofrece a nadie más). El formulario vive aparte y se monta al
 * abrir, así cada apertura arranca limpia.
 */
@Component({
  selector: 'lib-contenedores-transfer-dialog',
  standalone: true,
  imports: [DialogModule, ContenedorTransferFormComponent],
  templateUrl: './contenedores-transfer-dialog.component.html',
  styleUrl: './contenedores-transfer-dialog.component.scss',
})
export class ContenedoresTransferDialogComponent {
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly contenedor = input<Contenedor | null>(null);
  readonly visibleChange = output<boolean>();
  readonly transferred = output<void>();

  onTransferred(): void {
    this.transferred.emit();
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
  }
}
