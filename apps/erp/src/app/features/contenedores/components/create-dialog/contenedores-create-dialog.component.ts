import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { Contenedor, I18nService } from '@reddoc/core';
import { ContenedorCreateFormComponent } from './contenedor-create-form.component';
import { ContenedorCreationOverlayComponent } from '../creation-overlay/contenedor-creation-overlay.component';
import type { AppDict } from '../../../../i18n';

@Component({
  selector: 'app-contenedores-create-dialog',
  standalone: true,
  imports: [DialogModule, ContenedorCreateFormComponent, ContenedorCreationOverlayComponent],
  templateUrl: './contenedores-create-dialog.component.html',
  styleUrl: './contenedores-create-dialog.component.scss',
})
export class ContenedoresCreateDialogComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly contenedor = input<Contenedor | null>(null);
  readonly visibleChange = output<boolean>();
  readonly created = output<void>();
  readonly updated = output<void>();

  readonly isEditMode = computed(() => this.contenedor() !== null);

  // Nombre de la empresa en creación; el overlay full-screen se renderiza fuera
  // del <p-dialog> para no quedar contenido por el transform del modal.
  protected readonly creationOverlayNombre = signal<string | null>(null);

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
