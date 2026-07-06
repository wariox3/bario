import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { map } from 'rxjs/operators';
import { ErpSelectDataService, ErpSelectOption, type ParamValue } from '@reddoc/core';

/** Fila cruda del endpoint `contabilidad/cuenta/seleccionar/`. */
interface CuentaApiRow {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
}

/** Endpoint de selección de cuentas contables. */
const ENDPOINT = '/contabilidad/cuenta/seleccionar/';

/**
 * Filtros base de toda consulta de cuentas: solo cuentas que permiten movimiento
 * (las únicas imputables) y ordenadas por código.
 */
const BASE_PARAMS: Record<string, ParamValue> = {
  permite_movimiento: 'True',
  ordering: 'codigo',
};

/** Construye la etiqueta visible `código - nombre` (cae a lo disponible). */
function toOption(row: CuentaApiRow): ErpSelectOption {
  const label = [row.codigo, row.nombre].filter(Boolean).join(' - ');
  return { id: row.id, nombre: label || row.nombre || '' };
}

/**
 * Selector de cuentas contables.
 *
 * Autocomplete sobre `contabilidad/cuenta/seleccionar/` que:
 * - Trae primeros resultados al enfocar (`codigo__startswith=''`).
 * - Busca discriminando entrada numérica (`codigo__startswith`) de texto
 *   (`nombre__icontains`), siempre acotado a `permite_movimiento=True`.
 * - Muestra cada cuenta como `código - nombre`.
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `ErpSelectOption`
 * (`{ id, nombre }`) donde `nombre` ya es la etiqueta `código - nombre` —misma
 * convención que produce `item.mapper`, por lo que es intercambiable con
 * `lib-api-autocomplete` en los campos de cuenta.
 */
@Component({
  selector: 'app-cuenta-select',
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
      useExisting: forwardRef(() => ErpCuentaSelectComponent),
      multi: true,
    },
  ],
})
export class ErpCuentaSelectComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar cuenta…');
  readonly invalid = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados');
  readonly minLength = input<number>(0);
  readonly delay = input<number>(300);

  /** Filtros adicionales fijos para este campo (p. ej. `{ cuenta_clase: 4 }`). */
  readonly extraParams = input<Record<string, ParamValue>>({});

  /** Si el control está vacío, autoselecciona la primera cuenta de los resultados iniciales. */
  readonly suggestFirst = input<boolean>(false);

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ErpSelectOption[]>([]);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;
  private skipNextFocus = false;

  constructor() {
    // Carga eager solo cuando se pide sugerir: necesita los resultados sin esperar
    // el foco para poder preseleccionar el primero.
    effect(() => {
      if (!this.suggestFirst()) return;
      this.fetchInitial().subscribe((options) => {
        this.suggestions.set(options);
        this.applySuggestion(options);
      });
    });
  }

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
    this.fetchInitial().subscribe((options) => {
      this.suggestions.set(options);
      setTimeout(() => this.ac?.show());
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() ?? '';
    this.fetchCuentas(this.searchParams(query)).subscribe((options) =>
      this.suggestions.set(options),
    );
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  /** Resultados iniciales: filtros base + prefijo de código vacío. */
  private fetchInitial() {
    return this.fetchCuentas({ codigo__startswith: '' });
  }

  /**
   * Deriva los params de búsqueda: entrada numérica filtra por prefijo de código;
   * texto, por nombre contenido; vacío cae a los resultados iniciales.
   */
  private searchParams(query: string): Record<string, ParamValue> {
    if (query === '') return { codigo__startswith: '' };
    const esCodigo = !Number.isNaN(Number(query));
    return esCodigo ? { codigo__startswith: query } : { nombre__icontains: query };
  }

  private fetchCuentas(params: Record<string, ParamValue>) {
    return this.dataService
      .fetchOptions<CuentaApiRow>(ENDPOINT, { ...BASE_PARAMS, ...this.extraParams(), ...params })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((rows) => rows.map(toOption)),
      );
  }

  /**
   * Preselecciona la primera opción cuando el control está vacío. No pisa una
   * selección existente ni un valor cargado en edición (guard `value() === null`).
   */
  private applySuggestion(options: ErpSelectOption[]): void {
    if (this.value() !== null) return;
    const [first] = options;
    if (first) this.onValueChange(first);
  }
}
