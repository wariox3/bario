import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ErpSelectDataService, toFiniteNumber } from '@reddoc/core';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Opción de ítem para las líneas de detalle de un documento. Extiende
 * `ErpSelectOption` con `precio` para autollenar el precio de la línea al
 * seleccionar. La consumen las familias de documentos (servicio, comercial…).
 */
export interface ItemOption extends ErpSelectOption {
  readonly precio: number;
}

/**
 * Fila cruda del endpoint `general/item/seleccionar/`. `precio` llega como
 * string con cola de ceros (`"120600.000000"`); se normaliza en `toOption`.
 */
interface ItemApiRow {
  readonly id: number;
  readonly codigo?: string;
  readonly nombre?: string;
  readonly precio?: number | string;
}

/** Endpoint de selección de ítems. */
const ENDPOINT = '/general/item/seleccionar/';

/** Debounce del autocomplete (ms). Lo usa la plantilla y el timer de reapertura. */
const DELAY_MS = 300;

/** Construye la opción `{ id, nombre: 'código - nombre', precio }`. */
function toOption(row: ItemApiRow): ItemOption {
  const label = [row.codigo, row.nombre].filter(Boolean).join(' - ');
  return { id: row.id, nombre: label || row.nombre || '', precio: toFiniteNumber(row.precio) ?? 0 };
}

/**
 * Autocomplete de ítems para las líneas de detalle de un documento.
 *
 * A diferencia de los selectores genéricos de `core`, emite un `ItemOption` que
 * **incluye `precio`**, para que la línea de detalle autollene el precio al
 * seleccionar. Busca con `?search=<query>` sobre `general/item/seleccionar/` y
 * muestra `código - nombre`. Recarga la lista completa en cada enfoque y cada vez
 * que se vacía el input, para que el desplegable no quede pegado al último filtro.
 * Reutilizable por cualquier familia de documentos.
 */
@Component({
  selector: 'app-item-autocomplete',
  standalone: true,
  imports: [AutoCompleteModule, FormsModule],
  template: `
    <p-autocomplete
      [inputId]="inputId()"
      [ngModel]="value()"
      (onSelect)="onValueChange($event.value)"
      (onClear)="onCleared()"
      (onBlur)="onBlurred()"
      [suggestions]="suggestions()"
      (completeMethod)="onSearch($event)"
      (onFocus)="onFocusInput()"
      optionLabel="nombre"
      dataKey="id"
      [forceSelection]="true"
      [minLength]="0"
      [delay]="delayMs"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [fluid]="true"
      [showClear]="true"
      appendTo="body"
      autocomplete="off"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ErpItemAutocompleteComponent),
      multi: true,
    },
  ],
})
export class ErpItemAutocompleteComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar ítem…');
  readonly invalid = input<boolean>(false);

  readonly value = signal<ItemOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ItemOption[]>([]);

  private onChangeFn: (value: ItemOption | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;
  private skipNextFocus = false;
  private focused = false;
  private reopenTimer?: ReturnType<typeof setTimeout>;

  /** Debounce del autocomplete; la plantilla lo enlaza en `[delay]`. */
  protected readonly delayMs = DELAY_MS;

  /** Términos de búsqueda (enfoque, limpieza y tecleo); la última consulta gana. */
  private readonly query$ = new Subject<string>();

  constructor() {
    // Una sola tubería para todas las consultas: `switchMap` cancela la petición en
    // vuelo cuando llega un término nuevo (si no, la respuesta vieja podría pisar la
    // lista), y `catchError` deja `[]` para que PrimeNG apague su `loading` y muestre
    // el mensaje de vacío en vez de quedarse colgado.
    this.query$
      .pipe(
        switchMap((query) => this.fetchItems(query).pipe(catchError(() => of<ItemOption[]>([])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));
  }

  writeValue(value: ItemOption | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: ItemOption | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: ItemOption | null): void {
    this.value.set(next);
    this.onChangeFn(next);
    if (next !== null) this.skipNextFocus = true;
  }

  /**
   * Cada enfoque relanza la búsqueda sin filtro. `suggestions` guarda el último
   * resultado —casi siempre el de un término tecleado—, así que reusarlo dejaría el
   * desplegable pegado a ese filtro. `search()` con `source` ≠ `'input'` marca
   * `loading`, emite `completeMethod('')` y deja que PrimeNG abra el panel solo
   * cuando lleguen las sugerencias.
   */
  onFocusInput(): void {
    this.focused = true;
    // El enfoque ya recarga: sobra la reapertura diferida que pudo agendar `onCleared`.
    clearTimeout(this.reopenTimer);
    // Red de seguridad: salda el descuadre que `onBlurred` no pudo saldar por tener
    // el panel abierto (salir con Tab sin elegir nada).
    this.reconcileForceSelection();
    // Tras seleccionar, PrimeNG devuelve el foco al input; eso no debe reabrir el panel.
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    this.ac?.search(undefined, '', 'focus');
  }

  /**
   * Al vaciar el input PrimeNG **no** busca —descarta los términos en blanco cuyo
   * `source` es `'input'`— y, si se vació con Backspace, agenda cerrar el panel en
   * `delay/2`. Relanzamos la búsqueda sin filtro justo después de ese cierre para que
   * vuelva a verse la lista completa. Con la "x" el foco vuelve al input y la recarga
   * ya la hace `onFocusInput`, que de paso cancela este timer.
   */
  onCleared(): void {
    this.onValueChange(null);
    clearTimeout(this.reopenTimer);
    this.reopenTimer = setTimeout(
      () => {
        if (this.focused) this.ac?.search(undefined, '', 'reopen');
      },
      DELAY_MS / 2 + 60,
    );
  }

  onBlurred(): void {
    this.focused = false;
    clearTimeout(this.reopenTimer);
    this.reconcileForceSelection();
    this.onTouchedFn();
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    this.query$.next(event.query?.trim() ?? '');
  }

  /**
   * `forceSelection` descarta el texto que no coincide **exacto** con una opción: al
   * salir del campo, PrimeNG vacía el input y su modelo interno, pero como el
   * `[ngModel]` es de una vía no avisa hacia afuera. Sin esto el control se quedaría
   * con la opción anterior mientras el input se ve vacío, y un guardado enviaría el
   * valor viejo.
   *
   * Con el panel abierto el blur viene de un clic sobre una opción —el `mousedown`
   * desenfoca antes de que llegue el `click`—, así que la selección está en camino y
   * no hay nada que reconciliar: limpiar aquí propagaría un `null` intermedio al
   * formulario.
   */
  private reconcileForceSelection(): void {
    if (this.value() === null || this.ac?.overlayVisible) return;
    const input: HTMLInputElement | undefined = this.ac?.inputEL?.nativeElement;
    if (input && input.value.trim() === '') this.onValueChange(null);
  }

  private fetchItems(query: string) {
    return this.dataService.fetchOptions<ItemApiRow>(ENDPOINT, { search: query }).pipe(
      takeUntilDestroyed(this.destroyRef),
      map((rows) => rows.map(toOption)),
    );
  }
}
