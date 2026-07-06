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
import { map } from 'rxjs/operators';
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
 * muestra `código - nombre`. Reutilizable por cualquier familia de documentos.
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
      (onClear)="onValueChange(null)"
      (onBlur)="onTouchedFn()"
      [suggestions]="suggestions()"
      (completeMethod)="onSearch($event)"
      (onFocus)="onFocusInput()"
      optionLabel="nombre"
      dataKey="id"
      [forceSelection]="true"
      [minLength]="0"
      [delay]="300"
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

  onFocusInput(): void {
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    if (this.suggestions().length > 0) {
      this.ac?.show();
      return;
    }
    this.fetchItems('').subscribe((options) => {
      this.suggestions.set(options);
      setTimeout(() => this.ac?.show());
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() ?? '';
    this.fetchItems(query).subscribe((options) => this.suggestions.set(options));
  }

  private fetchItems(query: string) {
    return this.dataService.fetchOptions<ItemApiRow>(ENDPOINT, { search: query }).pipe(
      takeUntilDestroyed(this.destroyRef),
      map((rows) => rows.map(toOption)),
    );
  }
}
