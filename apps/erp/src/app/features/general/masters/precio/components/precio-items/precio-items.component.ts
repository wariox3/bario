import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { finalize } from 'rxjs';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import {
  ErpItemAutocompleteComponent,
  type ItemOption,
} from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import { IMPORT_PLANTILLA } from '@erp/core/components/import-dialog/import-plantillas.constant';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
import type { AppDict } from '@erp/i18n';
import { PrecioDetalleService } from '../../precio-detalle.service';
import type { PrecioDetalle } from '../../precio-detalle.model';
import { precioDetalleToItemOption, toPrecioDetallePayload } from '../../precio-detalle.mapper';
import { VR_PRECIO_MAX } from '../../precio.constants';

/**
 * Una fila de la tabla.
 *
 * `id` en `null` marca la línea que todavía no existe en el backend: nace así al
 * pulsar "Agregar ítem" y se persiste recién cuando se elige el ítem, que es el
 * dato sin el cual la línea no significa nada.
 *
 * `precioGuardado` no se pinta: recuerda el último importe que el backend
 * confirmó, para no repetir un PUT cuando el usuario entra y sale del campo sin
 * cambiar nada.
 */
type LineaForm = FormGroup<{
  id: FormControl<number | null>;
  item: FormControl<ItemOption | null>;
  vr_precio: FormControl<number | null>;
  precioGuardado: FormControl<number | null>;
  /**
   * Referencia del ítem, para la columna homónima. No se edita: la manda el
   * backend al leer la línea y al confirmarla, porque el autocomplete solo
   * conoce id, etiqueta y precio.
   */
  itemReferencia: FormControl<string>;
}>;

/**
 * Ítems de una lista de precios, con su precio propio.
 *
 * Cada línea se guarda **sola y al instante**: elegir el ítem la crea, salir del
 * campo de precio la actualiza, la papelera la borra. No hay botón de guardar
 * porque no hay nada que confirmar en conjunto — las líneas son autónomas, sin
 * totales ni cabecera que dependan de ellas.
 *
 * Sigue la convención de tablas de detalle del ERP (header sticky, celdas
 * compactas, importes a la derecha), sin el estado "pendiente" de las líneas de
 * documento: acá no hay nada pendiente, lo que se ve es lo que está guardado.
 */
@Component({
  selector: 'app-precio-items',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    ConfirmDialogModule,
    ErpItemAutocompleteComponent,
    ImportDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './precio-items.component.html',
  styleUrl: './precio-items.component.scss',
})
export class PrecioItemsComponent {
  private readonly service = inject(PrecioDetalleService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Lista de precios dueña de las líneas. */
  readonly precioId = input.required<number>();

  /**
   * Las filas viven en un `signal`, no en un `FormArray`: la tabla no se envía
   * como un todo —cada línea se guarda sola— así que el array no aportaba nada,
   * y su `length` **no es reactivo**, de modo que agregar una fila no repintaba
   * la tabla. Cada fila es un `FormGroup` suelto, atado con `[formGroup]`.
   */
  protected readonly lineas = signal<readonly LineaForm[]>([]);
  protected readonly isLoading = signal(true);

  /**
   * Índices con una petición en vuelo. Se indexa por posición y no por id
   * porque la línea nueva todavía no tiene id, y es justo la que más tarda.
   */
  private readonly ocupadas = signal<ReadonlySet<number>>(new Set());

  protected readonly total = computed(() => this.lineas().length);

  /** Tope del importe, para que el input no deje escribir lo que el backend rechaza. */
  protected readonly vrPrecioMax = VR_PRECIO_MAX;

  /**
   * La plantilla la publica el bucket, no el backend: es el XLSX que el ERP
   * anterior ofrece para esta misma importación. Pasa a `{ mode: 'enabled' }`
   * el día que exista un `precio-detalle/importar-ejemplo/` — el que hoy
   * declara el esquema es `precio/importar-ejemplo/`, que es la plantilla de
   * las **listas** de precio, no la de sus líneas.
   */
  protected readonly exampleConfig: ExampleConfig = {
    mode: 'external',
    url: IMPORT_PLANTILLA.precioDetalle,
  };

  /**
   * Aviso del diálogo: importar recarga la tabla desde el servidor, así que las
   * filas que todavía no llegaron al backend —agregadas sin elegir ítem— se
   * pierden. Se muestra siempre, como en el ERP anterior: el usuario lee la
   * condición antes de elegir el archivo, no después de perder el trabajo.
   */
  protected readonly importNotice = computed(() => this.t().entities.precio.items.import.notice);

  /**
   * Estado del diálogo de importación. Al terminar recarga la tabla entera: el
   * archivo pudo agregar decenas de líneas, y ninguna pasó por el formulario.
   */
  protected readonly importar = importState({
    upload: (file) => this.service.importar(this.precioId(), file),
    onImported: () => this.cargar(this.precioId()),
  });

  constructor() {
    effect(() => {
      const id = this.precioId();
      this.cargar(id);
    });
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /**
   * Abre el diálogo de importación. Lo llama la página, que es donde vive el
   * menú "Opciones" —junto a Editar, como en el ERP anterior—, pero el diálogo
   * y la recarga se quedan acá: quien sabe volver a leer las líneas es la tabla.
   */
  abrirImportar(): void {
    this.importar.open();
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  protected estaOcupada(index: number): boolean {
    return this.ocupadas().has(index);
  }

  /**
   * Suma una fila vacía. No toca el backend: una línea sin ítem no es nada que
   * el servidor pueda guardar.
   */
  protected agregar(): void {
    this.lineas.update((filas) => [...filas, this.nuevaLinea()]);
  }

  /**
   * El ítem elegido define la línea: si es nueva la crea, si ya existía la
   * actualiza.
   *
   * El precio del ítem se copia **solo si la celda está vacía**: es una
   * sugerencia para ahorrar tecleo, no una imposición — pisarlo borraría lo que
   * el usuario ya escribió, y fijar un precio distinto al del ítem es
   * exactamente para lo que existe una lista de precios.
   */
  private onItemElegido(linea: LineaForm): void {
    const item = linea.controls.item.value;
    if (!item) return;

    const index = this.lineas().indexOf(linea);
    if (index < 0) return;

    if (linea.controls.id.value === null) {
      if (linea.controls.vr_precio.value === null) {
        linea.controls.vr_precio.setValue(item.precio ?? 0);
      }
      this.crear(index);
    } else {
      this.actualizar(index);
    }
  }

  /**
   * Guarda el importe al salir del campo, y solo si cambió: sin esa
   * comparación, entrar y salir sin tocar nada dispararía un PUT por cada paso
   * del tabulador.
   */
  protected onPrecioBlur(index: number): void {
    const linea = this.lineas()[index];
    if (!linea) return;
    if (linea.controls.id.value === null) return;
    if (linea.controls.vr_precio.value === linea.controls.precioGuardado.value) return;
    this.actualizar(index);
  }

  protected confirmarEliminar(index: number): void {
    const linea = this.lineas()[index];
    if (!linea || this.estaOcupada(index)) return;

    // La línea que nunca llegó al backend se descarta sin preguntar: no hay
    // nada que perder y preguntarlo sería ruido.
    if (linea.controls.id.value === null) {
      this.quitarFila(index);
      return;
    }

    const dict = this.t().entities.precio.items.confirmDelete;
    this.confirmation.confirm({
      header: dict.header,
      message: dict.message.replace('{item}', linea.controls.item.value?.nombre ?? ''),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(index),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private nuevaLinea(detalle?: PrecioDetalle): LineaForm {
    const linea: LineaForm = new FormGroup({
      id: new FormControl<number | null>(detalle?.id ?? null),
      item: new FormControl<ItemOption | null>(precioDetalleToItemOption(detalle)),
      vr_precio: new FormControl<number | null>(detalle?.vrPrecio ?? null),
      precioGuardado: new FormControl<number | null>(detalle?.vrPrecio ?? null),
      itemReferencia: new FormControl<string>(detalle?.itemReferencia ?? '', {
        nonNullable: true,
      }),
    });

    // El índice se resuelve al disparar el evento, no acá: borrar una línea
    // corre a las de abajo, y una posición capturada al construir apuntaría a
    // otra fila.
    linea.controls.item.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onItemElegido(linea));

    return linea;
  }

  private cargar(precioId: number): void {
    this.isLoading.set(true);
    this.service
      .listar(precioId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (detalles) => {
          this.lineas.set(detalles.map((d) => this.nuevaLinea(d)));
        },
        error: () => {
          this.lineas.set([]);
          const toast = this.t().entities.precio.items.toasts.loadError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  private crear(index: number): void {
    const linea = this.lineas()[index];
    const item = linea.controls.item.value;
    if (!linea || !item) return;

    this.ocupar(index, true);
    this.service
      .crear(toPrecioDetallePayload(this.precioId(), item.id, linea.controls.vr_precio.value))
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ocupar(index, false)),
      )
      .subscribe({
        next: (creada) => {
          linea.controls.id.setValue(creada.id);
          linea.controls.precioGuardado.setValue(linea.controls.vr_precio.value);
          // La referencia solo la sabe el backend: el autocomplete no la trae.
          linea.controls.itemReferencia.setValue(creada.itemReferencia);
          const toast = this.t().entities.precio.items.toasts.createSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: (err: unknown) => {
          const toast = this.t().entities.precio.items.toasts.createError;
          this.toast.error(toast.title, extractErrorMessage(err, toast.desc));
        },
      });
  }

  /**
   * El éxito no lleva toast: cambiar un precio es la tarea de esta pantalla, y
   * anunciarla en cada celda convertiría el trabajo normal en una fila de
   * notificaciones. El valor que queda en la celda ya dice que se guardó; lo que
   * sí hay que avisar es el fallo, y ahí el valor vuelve al último confirmado
   * para que la tabla no muestre algo que el servidor no tiene.
   */
  private actualizar(index: number): void {
    const linea = this.lineas()[index];
    const id = linea.controls.id.value;
    const item = linea.controls.item.value;
    if (!linea || id === null || !item) return;

    this.ocupar(index, true);
    this.service
      .actualizar(
        id,
        toPrecioDetallePayload(this.precioId(), item.id, linea.controls.vr_precio.value),
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ocupar(index, false)),
      )
      .subscribe({
        next: (guardada) => {
          linea.controls.precioGuardado.setValue(linea.controls.vr_precio.value);
          linea.controls.itemReferencia.setValue(guardada.itemReferencia);
        },
        error: (err: unknown) => {
          linea.controls.vr_precio.setValue(linea.controls.precioGuardado.value);
          const toast = this.t().entities.precio.items.toasts.updateError;
          this.toast.error(toast.title, extractErrorMessage(err, toast.desc));
        },
      });
  }

  private eliminar(index: number): void {
    const linea = this.lineas()[index];
    const id = linea.controls.id.value;
    if (!linea || id === null) return;

    this.ocupar(index, true);
    this.service
      .eliminar(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.ocupar(index, false)),
      )
      .subscribe({
        next: () => {
          this.quitarFila(index);
          const toast = this.t().entities.precio.items.toasts.deleteSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: (err: unknown) => {
          const toast = this.t().entities.precio.items.toasts.deleteError;
          this.toast.error(toast.title, extractErrorMessage(err, toast.desc));
        },
      });
  }

  /**
   * Marca la fila como ocupada y bloquea sus campos mientras la petición vuela.
   * Se deshabilita el `FormGroup` —y no se pasa `[disabled]` por template—
   * porque es lo que los reactive forms esperan y lo que avisa al
   * `ControlValueAccessor` del autocomplete. `emitEvent: false` evita que
   * rehabilitar dispare el `valueChanges` del ítem y reintente el guardado.
   */
  private ocupar(index: number, ocupada: boolean): void {
    const siguiente = new Set(this.ocupadas());
    if (ocupada) siguiente.add(index);
    else siguiente.delete(index);
    this.ocupadas.set(siguiente);

    const linea = this.lineas()[index];
    if (!linea) return;
    if (ocupada) linea.disable({ emitEvent: false });
    else linea.enable({ emitEvent: false });
  }

  private quitarFila(index: number): void {
    this.lineas.update((filas) => filas.filter((_, i) => i !== index));
  }
}
