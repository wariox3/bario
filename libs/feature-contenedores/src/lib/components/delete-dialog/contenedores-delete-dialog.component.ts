import { Component, inject, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { Contenedor, I18nService } from '@reddoc/core';
import { ContenedorDeleteFormComponent } from './contenedor-delete-form.component';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedores-delete-dialog',
  standalone: true,
  imports: [DialogModule, ContenedorDeleteFormComponent],
  templateUrl: './contenedores-delete-dialog.component.html',
  styleUrl: './contenedores-delete-dialog.component.scss',
})
export class ContenedoresDeleteDialogComponent {
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly contenedor = input<Contenedor | null>(null);
  readonly visibleChange = output<boolean>();
  readonly deleted = output<void>();

  onDeleted(): void {
    this.deleted.emit();
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
  }
}
