import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ContenedorDetalle, ContenedorService, I18nService, getInitials } from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

/** Lo que acepta el backend: JPEG, PNG o WEBP. */
const TIPOS_ACEPTADOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
/** Tope del backend (5 MB). Se valida antes de subir para no gastar la petición. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * La imagen que identifica a la empresa — la que ocupa el lugar de la inicial
 * en las tarjetas y filas del listado. No es el logotipo de los formatos
 * impresos (ese vive en «Mi empresa»).
 *
 * Guarda sola, sin pasar por «Guardar cambios»: elegir la imagen ya es la
 * decisión, y atarla al submit dejaría al modal mostrando una imagen que el
 * backend todavía no tiene (y que «Cancelar» tendría que deshacer). Por eso el
 * pie lo dice en voz baja: «Se guarda al elegirla».
 *
 * Sin recortador: el backend ya genera el original (1024px) y la miniatura
 * cuadrada (320×320). El recuadro pinta la miniatura con `object-cover`, que
 * es como se va a ver en el listado.
 */
@Component({
  selector: 'lib-contenedor-imagen',
  standalone: true,
  imports: [NgClass, ButtonModule],
  templateUrl: './contenedor-imagen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ContenedorImagenComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly accept = TIPOS_ACEPTADOS.join(',');

  readonly contenedor = input.required<ContenedorDetalle>();
  /** Nombre que se está escribiendo en el form: la inicial lo sigue en vivo. */
  readonly nombre = input<string>('');
  /** La ficha que devolvió el backend tras subir o quitar la imagen. */
  readonly changed = output<ContenedorDetalle>();

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /**
   * Lo último que respondió el backend. `undefined` = todavía nada: manda la
   * ficha con la que se abrió el modal.
   */
  private readonly imagenActual = signal<string | null | undefined>(undefined);

  protected readonly imagen = computed(() => {
    const actual = this.imagenActual();
    return actual === undefined ? this.contenedor().imagen_thumbnail : actual;
  });
  protected readonly inicial = computed(() =>
    getInitials(this.nombre() || this.contenedor().nombre),
  );
  protected readonly tileLabel = computed(() =>
    this.t().contenedores.edit.image.tileLabel.replace(
      '{nombre}',
      this.nombre() || this.contenedor().nombre,
    ),
  );

  protected readonly busy = signal<'subiendo' | 'quitando' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly dragging = signal(false);

  protected openPicker(): void {
    if (this.busy()) return;
    this.fileInput().nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Limpio ya: así elegir el mismo archivo otra vez vuelve a disparar `change`.
    input.value = '';
    if (file) this.subir(file);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.busy()) return;
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(): void {
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file && !this.busy()) this.subir(file);
  }

  protected quitar(): void {
    if (this.busy() || !this.imagen()) return;
    this.error.set(null);
    this.busy.set('quitando');
    this.contenedorService
      .quitarImagen(this.contenedor().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ficha) => this.aplicar(ficha),
        error: (err: unknown) => this.fallo(err, this.t().contenedores.edit.image.errors.remove),
      });
  }

  private subir(file: File): void {
    const errors = this.t().contenedores.edit.image.errors;
    if (!TIPOS_ACEPTADOS.includes(file.type)) {
      this.error.set(errors.type);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set(errors.size);
      return;
    }

    this.error.set(null);
    this.busy.set('subiendo');
    this.contenedorService
      .subirImagen(this.contenedor().id, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ficha) => this.aplicar(ficha),
        error: (err: unknown) => this.fallo(err, errors.upload),
      });
  }

  private aplicar(ficha: ContenedorDetalle): void {
    this.imagenActual.set(ficha.imagen_thumbnail);
    this.busy.set(null);
    this.changed.emit(ficha);
  }

  /**
   * El 400 («la imagen no sirve») no lo avisa el interceptor: va acá, con el
   * `detail` del backend. El resto (403, 5xx, red) ya lo tosteó el interceptor;
   * el mensaje genérico queda igual junto al recuadro, que es donde se mira.
   */
  private fallo(err: unknown, generico: string): void {
    this.busy.set(null);
    const detail =
      err instanceof HttpErrorResponse && err.status === 400
        ? (err.error as { detail?: unknown } | null)?.detail
        : undefined;
    this.error.set(typeof detail === 'string' && detail ? detail : generico);
  }
}
