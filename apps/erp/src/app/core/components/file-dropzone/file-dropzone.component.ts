import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { validarArchivo, type ArchivoRechazo } from './validar-archivo';

/**
 * Zona para soltar o elegir **un** archivo: el recuadro punteado, el arrastre,
 * el teclado (es un `role="button"`), el `<input type="file">` oculto y la
 * validación de tipo y tamaño.
 *
 * Tonta en lo que dice: el ícono y los textos llegan por `ng-content`, porque
 * cada pantalla habla de su archivo (un Excel, un certificado, un adjunto). Y no
 * sube nada: emite el archivo válido o el motivo del rechazo, y la pantalla
 * decide qué hacer con cada uno.
 *
 * La usan el importar, los adjuntos y el certificado digital. Antes cada una
 * tenía su copia de este manejo.
 */
@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  templateUrl: './file-dropzone.component.html',
  host: { class: 'block' },
})
export class FileDropzoneComponent {
  /** Extensiones aceptadas, formato del atributo `accept` (`.xlsx,.xls`). Vacío = todas. */
  readonly accept = input<string>('');
  readonly maxSizeMB = input<number>(10);
  /** Ocupada (subiendo, importando): no abre el selector ni recibe archivos. */
  readonly disabled = input(false);
  /** Pinta el estado de error; el mensaje lo muestra la pantalla. */
  readonly invalid = input(false);
  readonly ariaLabel = input.required<string>();
  /** `md` para la zona protagonista de un paso o diálogo; `sm` cuando va sobre una lista. */
  readonly size = input<'md' | 'sm'>('md');

  readonly fileSelected = output<File>();
  readonly fileRejected = output<ArchivoRechazo>();

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly dragOver = signal(false);

  /** Tamaño + estado. El estado se resuelve en orden: ocupada > arrastrando > error > reposo. */
  protected readonly zonaClass = computed(() => {
    const tamano =
      this.size() === 'md' ? 'rounded-[14px] px-6 py-9' : 'gap-1 rounded-xl px-5 py-[1.15rem]';
    const estado = this.disabled()
      ? 'cursor-default opacity-75 border-[rgba(20,48,73,0.15)] bg-sky-50/40'
      : this.dragOver()
        ? 'cursor-pointer scale-[1.01] border-solid border-sky-500 bg-sky-100'
        : this.invalid()
          ? 'cursor-pointer border-red-300 bg-red-50/50'
          : 'cursor-pointer border-[rgba(20,48,73,0.15)] bg-sky-50/40 hover:border-sky-300 hover:bg-sky-50/70';
    return `${tamano} ${estado}`;
  });

  protected abrir(): void {
    if (this.disabled()) return;
    this.fileInput().nativeElement.click();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.abrir();
    }
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.recibir(file);
    // Permite volver a elegir el mismo archivo tras quitarlo o si falló.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.disabled()) return;
    this.dragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.disabled()) return;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) this.recibir(file);
  }

  private recibir(file: File): void {
    const rechazo = validarArchivo(file, this.accept(), this.maxSizeMB());
    if (rechazo) this.fileRejected.emit(rechazo);
    else this.fileSelected.emit(file);
  }
}
