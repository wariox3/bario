import { Component, computed, inject, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ContenedorDetalle, I18nService } from '@reddoc/core';
import { ContenedorCreateFormComponent } from './contenedor-create-form.component';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedores-create-dialog',
  standalone: true,
  imports: [DialogModule, ContenedorCreateFormComponent],
  templateUrl: './contenedores-create-dialog.component.html',
  styleUrl: './contenedores-create-dialog.component.scss',
})
export class ContenedoresCreateDialogComponent {
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly contenedor = input<ContenedorDetalle | null>(null);
  readonly visibleChange = output<boolean>();
  readonly created = output<void>();
  readonly updated = output<void>();

  readonly isEditMode = computed(() => this.contenedor() !== null);

  onCreated(): void {
    this.created.emit();
    this.visibleChange.emit(false);
  }

  onUpdated(): void {
    this.updated.emit();
    this.visibleChange.emit(false);
  }

  onCancel(): void {
    this.visibleChange.emit(false);
  }
}
