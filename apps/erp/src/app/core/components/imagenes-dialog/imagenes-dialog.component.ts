import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { finalize } from 'rxjs';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ArchivoOwner } from '../archivos-dialog/archivo.types';
import { FileDropzoneComponent } from '../file-dropzone/file-dropzone.component';
import type { ArchivoRechazo } from '../file-dropzone/validar-archivo';
import { ImagenService } from './imagen.service';
import type { Imagen } from './imagen.types';

/**
 * Galería de **imágenes** de un registro (`general/imagen/`).
 *
 * Gemelo del `ArchivosDialogComponent`, pero con lo que una galería necesita y
 * un adjunto no: miniaturas en vez de filas, y cuál es la **principal** —la que
 * la ficha pinta en su encabezado—. Hace su propio HTTP por la misma razón que
 * los adjuntos: el endpoint es uno solo para todo el ERP y el host solo aporta
 * de quién son las imágenes, vía `owner`.
 *
 * ```html
 * <app-imagenes-dialog [(visible)]="imagenesVisible" [owner]="owner()" (cambio)="recargar()" />
 * ```
 *
 * `cambio` avisa cada vez que la galería se modificó, porque cualquier
 * modificación puede mover la principal (la primera que se sube, la que se
 * marca, la que se borra) y la ficha tiene que volver a leerla.
 */
@Component({
  selector: 'app-imagenes-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, ConfirmDialogModule, TooltipModule, FileDropzoneComponent],
  providers: [ConfirmationService],
  templateUrl: './imagenes-dialog.component.html',
  styleUrl: './imagenes-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El diálogo se pinta `fixed`: el host no ocupa lugar en el flujo.
  host: { class: 'contents' },
})
export class ImagenesDialogComponent {
  // ── API pública ───────────────────────────────────────────────────────────

  /** Visibilidad del diálogo (two-way: `[(visible)]`). */
  readonly visible = model<boolean>(false);

  /** De quién son las imágenes. `null` mientras la ficha aún no cargó su registro. */
  readonly owner = input<ArchivoOwner | null>(null);

  /** Título del header. Por defecto, "Imágenes". */
  readonly title = input<string>('');

  /** Subtítulo del header. */
  readonly subtitle = input<string>('');

  /** Extensiones aceptadas (formato del atributo `accept`). */
  readonly accept = input<string>('.png,.jpg,.jpeg,.webp');

  /** Tamaño máximo por imagen, en MB. */
  readonly maxSizeMB = input<number>(10);

  /** La galería cambió: subida, principal marcada o imagen borrada. */
  readonly cambio = output<void>();

  // ── Colaboradores ─────────────────────────────────────────────────────────

  private readonly service = inject(ImagenService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────

  protected readonly items = signal<readonly Imagen[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isUploading = signal(false);
  /** Id de la imagen con una operación en vuelo; solo su tarjeta muestra el spinner. */
  protected readonly workingId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  // ── Derivados ─────────────────────────────────────────────────────────────

  protected readonly headerTitle = computed(() => this.title() || this.t().common.imagenes.title);

  protected readonly headerSubtitle = computed(
    () => this.subtitle() || this.t().common.imagenes.subtitle,
  );

  /** Mientras hay una operación en curso, el diálogo no se cierra ni acepta otra. */
  protected readonly isBusy = computed(() => this.isUploading() || this.workingId() !== null);

  protected readonly dropzoneHint = computed(() =>
    this.t().common.imagenes.dropzone.hint.replace('{max}', String(this.maxSizeMB())),
  );

  constructor() {
    // Misma mecánica que los adjuntos: se pide al abrir, se vacía al cerrar.
    effect(() => {
      const abierto = this.visible();
      const owner = this.owner();
      untracked(() => {
        this.errorMessage.set(null);
        if (abierto && owner) {
          this.cargarLista(owner);
        } else {
          this.items.set([]);
        }
      });
    });
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  protected onVisibleChange(value: boolean): void {
    this.visible.set(value);
  }

  protected onClose(): void {
    if (this.isBusy()) return;
    this.visible.set(false);
  }

  protected onFileRejected(motivo: ArchivoRechazo): void {
    const dict = this.t().common.imagenes.dropzone;
    this.errorMessage.set(motivo === 'tipo' ? dict.invalidType : dict.tooLarge);
  }

  protected subir(file: File): void {
    const owner = this.owner();
    if (!owner || this.isBusy()) return;

    this.errorMessage.set(null);
    this.isUploading.set(true);
    this.service
      .cargar(owner, file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isUploading.set(false)),
      )
      .subscribe({
        next: () => this.alCambiar(owner, this.t().common.imagenes.toasts.uploadSuccess),
        error: () => {
          const toast = this.t().common.imagenes.toasts.uploadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  protected marcarPrincipal(imagen: Imagen): void {
    const owner = this.owner();
    if (!owner || this.isBusy() || imagen.principal) return;

    this.workingId.set(imagen.id);
    this.service
      .marcarPrincipal(imagen.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.workingId.set(null)),
      )
      .subscribe({
        next: () => this.alCambiar(owner, this.t().common.imagenes.toasts.principalSuccess),
        error: () => {
          const toast = this.t().common.imagenes.toasts.principalError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  protected confirmarEliminar(imagen: Imagen): void {
    if (this.isBusy()) return;
    const dict = this.t().common.imagenes.confirmDelete;
    this.confirmation.confirm({
      header: dict.header,
      message: imagen.principal ? dict.messagePrincipal : dict.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(imagen),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private cargarLista(owner: ArchivoOwner): void {
    this.isLoading.set(true);
    this.service
      .listar(owner)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (imagenes) => this.items.set(imagenes),
        error: () => {
          this.items.set([]);
          const toast = this.t().common.imagenes.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  private eliminar(imagen: Imagen): void {
    const owner = this.owner();
    if (!owner) return;

    this.workingId.set(imagen.id);
    this.service
      .eliminar(imagen.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.workingId.set(null)),
      )
      .subscribe({
        next: () => this.alCambiar(owner, this.t().common.imagenes.toasts.deleteSuccess),
        error: (err: unknown) => {
          const toast = this.t().common.imagenes.toasts.deleteError;
          this.toast.error(toast.title, extractErrorMessage(err, toast.desc));
        },
      });
  }

  /** Tras cualquier modificación: avisa, refresca la grilla y le cuenta al host. */
  private alCambiar(owner: ArchivoOwner, toast: { title: string; desc: string }): void {
    this.toast.success(toast.title, toast.desc);
    this.cargarLista(owner);
    this.cambio.emit();
  }
}
