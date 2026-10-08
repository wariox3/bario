import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type Signal,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ImageCropperComponent, type ImageCroppedEvent } from 'ngx-image-cropper';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/** Tamaño máximo del recorte resultante (~2 MB), alineado con el legacy. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Carga y eliminación de una imagen única — componente reusable del ERP.
 *
 * Tonto respecto al backend: muestra la imagen actual (`imageUrl`) y emite
 * `imageSelected` (data-URL base64 ya recortado) o `imageRemoved`; el dueño
 * decide cómo persistir. El recorte se hace en un diálogo con `ngx-image-cropper`
 * (cuadrado por defecto, salida JPEG). Pensado para item, logo de empresa,
 * avatar, etc.
 */
@Component({
  selector: 'app-erp-image-upload',
  standalone: true,
  imports: [ButtonModule, DialogModule, ImageCropperComponent],
  templateUrl: './erp-image-upload.component.html',
  styleUrl: './erp-image-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErpImageUploadComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** URL de la imagen actual (absoluta o data-URL). `null` → muestra el placeholder. */
  readonly imageUrl = input<string | null>(null);
  readonly width = input<string>('220px');
  readonly height = input<string>('160px');
  readonly disabled = input<boolean>(false);
  /** Relación de aspecto del recorte (1 = cuadrado). Se ignora si el recorte es libre. */
  readonly aspectRatio = input<number>(1);
  /**
   * `false` = recorte libre. Lo pide un logotipo, que suele ser apaisado: forzarlo
   * a la proporción del marco lo deforma o le corta media palabra.
   */
  readonly maintainAspectRatio = input<boolean>(true);
  /**
   * Formato del recorte. `png` conserva la transparencia —lo que necesita un
   * logotipo, que se imprime sobre fondos que no son blancos—; `jpeg` pesa menos
   * y alcanza para una foto.
   */
  readonly format = input<'jpeg' | 'png'>('jpeg');
  /**
   * Cómo llena la imagen su marco. `cover` recorta para no dejar aire (una foto);
   * `contain` la muestra entera aunque sobre espacio (un logotipo).
   */
  readonly fit = input<'cover' | 'contain'>('cover');
  /** Formatos que ofrece el selector de archivos del sistema. */
  readonly accept = input<string>('.png,.jpg,.jpeg,image/png,image/jpeg');
  /** Pie con los formatos aceptados. Sin valor, el genérico del diccionario. */
  readonly hint = input<string>();
  readonly alt = input<string>('');

  /** Data-URL base64 del recorte listo para subir. */
  readonly imageSelected = output<string>();
  /** Petición de eliminar la imagen actual. */
  readonly imageRemoved = output<void>();

  @ViewChild('fileInput') private readonly fileInput?: ElementRef<HTMLInputElement>;

  protected readonly hasImage: Signal<boolean> = computed(() => !!this.imageUrl());

  /** Estado del diálogo de recorte. */
  protected readonly dialogVisible = signal(false);
  protected readonly fileChangeEvent = signal<Event | null>(null);
  protected readonly cropped = signal<string | null>(null);
  protected readonly tooLarge = signal(false);

  protected openPicker(): void {
    if (this.disabled()) return;
    this.fileInput?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.cropped.set(null);
    this.tooLarge.set(false);
    this.fileChangeEvent.set(event);
    this.dialogVisible.set(true);
  }

  protected onImageCropped(event: ImageCroppedEvent): void {
    const base64 = event.base64 ?? null;
    this.cropped.set(base64);
    this.tooLarge.set(base64 != null && base64ByteSize(base64) > MAX_BYTES);
  }

  protected onConfirm(): void {
    const base64 = this.cropped();
    if (!base64 || this.tooLarge()) return;
    this.imageSelected.emit(base64);
    this.closeDialog();
  }

  protected onCancel(): void {
    this.closeDialog();
  }

  protected onRemove(): void {
    if (this.disabled() || !this.hasImage()) return;
    this.imageRemoved.emit();
  }

  protected onDialogHide(): void {
    this.resetPicker();
  }

  private closeDialog(): void {
    this.dialogVisible.set(false);
    this.resetPicker();
  }

  /** Limpia el input para permitir re-seleccionar el mismo archivo. */
  private resetPicker(): void {
    this.fileChangeEvent.set(null);
    this.cropped.set(null);
    this.tooLarge.set(false);
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }
}

/** Bytes aproximados de un data-URL base64 (sin contar el prefijo `data:`). */
function base64ByteSize(dataUrl: string): number {
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}
