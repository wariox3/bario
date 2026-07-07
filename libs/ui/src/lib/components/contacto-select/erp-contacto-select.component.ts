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
import { ErpSelectDataService, type ErpSelectOption, type ParamValue } from '@reddoc/core';

/**
 * Fila cruda del endpoint `general/contacto/seleccionar/`.
 *
 * El nombre puede llegar como `nombre_corto` (convención del master) o `nombre`
 * (etiqueta ya armada); se contemplan ambos y se cae al disponible.
 */
interface ContactoApiRow {
  readonly id: number;
  readonly numero_identificacion?: string;
  readonly nombre_corto?: string;
  readonly nombre?: string;
}

/** Endpoint de selección de contactos. */
const ENDPOINT = '/general/contacto/seleccionar/';

/** Construye la etiqueta visible `identificación - nombre` (cae a lo disponible). */
function toOption(row: ContactoApiRow): ErpSelectOption {
  const name = row.nombre_corto ?? row.nombre ?? '';
  const label = [row.numero_identificacion, name].filter(Boolean).join(' - ');
  return { id: row.id, nombre: label || name };
}

/**
 * Selector de contactos.
 *
 * Autocomplete sobre `general/contacto/seleccionar/` que:
 * - Trae los primeros resultados al enfocar (sin término de búsqueda).
 * - Busca con el parámetro genérico DRF `?search=<query>` (el backend resuelve
 *   contra identificación y nombre).
 * - Muestra cada contacto como `identificación - nombre`.
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `ErpSelectOption`
 * (`{ id, nombre }`) donde `nombre` ya es la etiqueta `identificación - nombre`,
 * misma convención que `app-cuenta-select` — intercambiable con
 * `lib-api-autocomplete` en los campos de contacto.
 */
@Component({
  selector: 'lib-contacto-select',
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
      [minLength]="minLength()"
      [delay]="delay()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [emptyMessage]="emptyMessage()"
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
      useExisting: forwardRef(() => ErpContactoSelectComponent),
      multi: true,
    },
  ],
})
export class ErpContactoSelectComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar contacto…');
  readonly invalid = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados');
  readonly minLength = input<number>(0);
  readonly delay = input<number>(300);

  /** Filtros adicionales fijos para este campo (p. ej. `{ cliente: 'True' }`). */
  readonly extraParams = input<Record<string, ParamValue>>({});

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ErpSelectOption[]>([]);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;
  private skipNextFocus = false;

  writeValue(value: ErpSelectOption | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: ErpSelectOption | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: ErpSelectOption | null): void {
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
    this.fetchContactos('').subscribe((options) => {
      this.suggestions.set(options);
      setTimeout(() => this.ac?.show());
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() ?? '';
    this.fetchContactos(query).subscribe((options) => this.suggestions.set(options));
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private fetchContactos(query: string) {
    return this.dataService
      .fetchOptions<ContactoApiRow>(ENDPOINT, { ...this.extraParams(), search: query })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((rows) => rows.map(toOption)),
      );
  }
}
