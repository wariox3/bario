import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { I18nService, ToastService, FORMATO_FECHA } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { formatBytes } from '@erp/core/utils/format-bytes';
import { ARCHIVO_TIPO, ArchivoService } from './archivo.service';
import type { Archivo, ArchivoOwner } from './archivo.types';

/**
 * Diálogo de **archivos adjuntos** de un documento o de un registro de master.
 *
 * Lista lo que ya está cargado, sube uno nuevo (drag & drop o click), descarga y
 * elimina con confirmación. Lo abre el menú "Opciones → Archivos" de las fichas
 * de detalle.
 *
 * A diferencia del `ImportDialogComponent` —tonto, porque cada master importa
 * contra su propio endpoint— este **sí hace su HTTP**: `general/archivo/` es uno
 * solo para todo el ERP, así que dejarlo afuera obligaría a repetir el mismo
 * cableado en cada ficha. Lo que el host aporta es únicamente **de quién** son
 * los archivos, vía `owner`.
 *
 * ```html
 * <app-archivos-dialog [(visible)]="archivosVisible" [owner]="archivosOwner()" />
 * ```
 *
 * La lista se pide al abrir y se refresca tras cada carga o borrado; al cerrarse
 * queda vacía, para que la próxima apertura no muestre los archivos del registro
 * anterior mientras llega la respuesta.
 */
@Component({
  selector: 'app-archivos-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, ConfirmDialogModule, DatePipe],
  providers: [ConfirmationService],
  templateUrl: './archivos-dialog.component.html',
  styleUrl: './archivos-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivosDialogComponent {
  // ── API pública ───────────────────────────────────────────────────────────

  /** Visibilidad del diálogo (two-way: `[(visible)]`). */
  readonly visible = model<boolean>(false);

  /** De quién son los archivos. `null` mientras la ficha aún no cargó su registro. */
  readonly owner = input<ArchivoOwner | null>(null);

  /** Título del header. Por defecto, "Archivos". */
  readonly title = input<string>('');

  /**
   * Subtítulo del header. Por defecto describe adjuntos genéricos; un diálogo
   * acotado a un tipo (la galería de imágenes de un ítem) pasa el suyo, para que
   * el encabezado no prometa una cosa y la lista muestre otra.
   */
  readonly subtitle = input<string>('');

  /**
   * Extensiones aceptadas (formato del atributo `accept`, ej. `.pdf,.xlsx`).
   * Vacío = cualquier archivo, que es el caso de los adjuntos.
   */
  readonly accept = input<string>('');

  /** Tamaño máximo por archivo, en MB. */
  readonly maxSizeMB = input<number>(10);

  /**
   * Tipo de archivo que este diálogo administra. Gobierna **las dos** puntas:
   * lista solo los de ese tipo y sube con ese tipo. Así un mismo registro puede
   * tener dos diálogos que no se pisan — la galería de imágenes de un ítem y
   * sus adjuntos. Ver `ARCHIVO_TIPO`.
   */
  readonly archivoTipo = input<number>(ARCHIVO_TIPO.ADJUNTO);

  // ── Colaboradores ─────────────────────────────────────────────────────────

  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angularConHora;

  private readonly service = inject(ArchivoService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly items = signal<readonly Archivo[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isUploading = signal(false);
  /** Id del archivo que se está borrando; solo su fila muestra el spinner. */
  protected readonly deletingId = signal<number | null>(null);
  /** Id del archivo que se está descargando; solo su fila muestra el spinner. */
  protected readonly downloadingId = signal<number | null>(null);
  protected readonly dragOver = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // ── Derivados ─────────────────────────────────────────────────────────────

  protected readonly headerTitle = computed(() => this.title() || this.t().common.archivos.title);

  protected readonly headerSubtitle = computed(
    () => this.subtitle() || this.t().common.archivos.subtitle,
  );

  /** Mientras hay una operación en curso, el diálogo no se cierra ni acepta otra. */
  protected readonly isBusy = computed(() => this.isUploading() || this.deletingId() !== null);

  /** Hint de la zona de carga, con el tope de tamaño ya resuelto. */
  protected readonly dropzoneHint = computed(() =>
    this.t().common.archivos.dropzone.hint.replace('{max}', String(this.maxSizeMB())),
  );

  constructor() {
    // La lista se pide al abrir y se descarta al cerrar. El efecto depende solo
    // de `visible` y `owner`: `untracked` mantiene fuera lo que lee `cargarLista`,
    // para que refrescar la lista no vuelva a disparar el efecto.
    effect(() => {
      const abierto = this.visible();
      const owner = this.owner();
      // El tipo se lee acá —no dentro del `untracked`— porque cambiarlo cambia
      // qué archivos hay que traer, igual que cambiar de dueño.
      this.archivoTipo();
      untracked(() => {
        this.errorMessage.set(null);
        this.dragOver.set(false);
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

  protected formatTamano(bytes: number): string {
    return formatBytes(bytes);
  }

  protected openFilePicker(): void {
    if (this.isBusy()) return;
    this.fileInput()?.nativeElement.click();
  }

  /** El picker también se abre con teclado: la dropzone es un `role="button"`. */
  protected onDropzoneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFilePicker();
    }
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.subir(file);
    // Permite volver a elegir el mismo archivo si la carga falló.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.isBusy()) return;
    this.dragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.isBusy()) return;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) this.subir(file);
  }

  /**
   * Descarga el archivo. No entra en `isBusy`: es una lectura, no bloquea subir
   * ni borrar, y solo deshabilita su propio botón mientras viaja.
   */
  protected descargar(archivo: Archivo): void {
    if (this.downloadingId() !== null) return;

    this.downloadingId.set(archivo.id);
    this.service
      .descargar(archivo)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.downloadingId.set(null)),
      )
      .subscribe({
        error: () => {
          const toast = this.t().common.archivos.toasts.downloadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  protected confirmarEliminar(archivo: Archivo): void {
    if (this.isBusy()) return;
    const dict = this.t().common.archivos.confirmDelete;
    this.confirmation.confirm({
      header: dict.header,
      message: dict.message.replace('{nombre}', archivo.nombre),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(archivo),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private cargarLista(owner: ArchivoOwner): void {
    this.isLoading.set(true);
    this.service
      .listar(owner, this.archivoTipo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (archivos) => this.items.set(archivos),
        error: () => {
          this.items.set([]);
          const toast = this.t().common.archivos.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /**
   * Valida extensión y tamaño contra `accept` / `maxSizeMB` antes de gastar una
   * petición, y sube. El error de validación se muestra en el diálogo, no como
   * toast: es sobre el archivo que el usuario acaba de soltar, y ahí lo mira.
   */
  private subir(file: File): void {
    const owner = this.owner();
    if (!owner || this.isBusy()) return;

    const dict = this.t().common.archivos.dropzone;
    if (!this.esExtensionValida(file)) {
      this.errorMessage.set(dict.invalidType);
      return;
    }
    if (file.size > this.maxSizeMB() * 1024 * 1024) {
      this.errorMessage.set(dict.tooLarge);
      return;
    }

    this.errorMessage.set(null);
    this.isUploading.set(true);
    this.service
      .cargar(owner, file, this.archivoTipo())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isUploading.set(false)),
      )
      .subscribe({
        next: () => {
          const toast = this.t().common.archivos.toasts.uploadSuccess;
          this.toast.success(toast.title, toast.desc);
          this.cargarLista(owner);
        },
        error: () => {
          const toast = this.t().common.archivos.toasts.uploadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  private esExtensionValida(file: File): boolean {
    const extensiones = this.accept()
      .split(',')
      .map((ext) => ext.trim().toLowerCase())
      .filter(Boolean);
    if (extensiones.length === 0) return true;
    const nombre = file.name.toLowerCase();
    return extensiones.some((ext) => nombre.endsWith(ext));
  }

  private eliminar(archivo: Archivo): void {
    const owner = this.owner();
    if (!owner) return;

    this.deletingId.set(archivo.id);
    this.service
      .eliminar(archivo.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deletingId.set(null)),
      )
      .subscribe({
        next: () => {
          const toast = this.t().common.archivos.toasts.deleteSuccess;
          this.toast.success(toast.title, toast.desc);
          this.cargarLista(owner);
        },
        error: () => {
          const toast = this.t().common.archivos.toasts.deleteError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }
}
