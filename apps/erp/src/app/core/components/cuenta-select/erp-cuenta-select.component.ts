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
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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

/**
 * Construye la opción: etiqueta visible `código - nombre` (cae a lo disponible)
 * y el **código suelto**, para los formularios cuyo backend lo pide en vez del id
 * (p. ej. el rango de cuentas del cierre contable). `ErpSelectOption` admite
 * campos extra, así que exponerlo no rompe a nadie: quien no lo necesite sigue
 * leyendo `id` y `nombre`.
 */
function toOption(row: CuentaApiRow): ErpSelectOption {
  const label = [row.codigo, row.nombre].filter(Boolean).join(' - ');
  return { id: row.id, nombre: label || row.nombre || '', codigo: row.codigo ?? '' };
}

/**
 * Selector de cuentas contables.
 *
 * Autocomplete sobre `contabilidad/cuenta/seleccionar/` que:
 * - Recarga la lista inicial (`codigo__startswith=''`) en cada enfoque y cada vez
 *   que se vacía el input, para que el desplegable no quede pegado al último filtro.
 * - Busca discriminando entrada numérica (`codigo__startswith`) de texto
 *   (`nombre__icontains`), siempre acotado a `permite_movimiento=True`.
 * - Muestra cada cuenta como `código - nombre`.
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `ErpSelectOption`
 * (`{ id, nombre, codigo }`) donde `nombre` ya es la etiqueta `código - nombre`
 * —misma convención que produce `item.mapper`, por lo que es intercambiable con
 * `lib-api-autocomplete` en los campos de cuenta— y `codigo` viene suelto para
 * los backends que piden el código en vez del id.
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
      (onClear)="onCleared()"
      (onBlur)="onBlurred()"
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
  private focused = false;
  private reopenTimer?: ReturnType<typeof setTimeout>;

  /** Términos de búsqueda (enfoque, limpieza y tecleo); la última consulta gana. */
  private readonly query$ = new Subject<string>();

  constructor() {
    // Una sola tubería para todas las consultas: `switchMap` cancela la petición en
    // vuelo cuando llega un término nuevo (si no, la respuesta vieja podría pisar la
    // lista), y `catchError` deja `[]` para que PrimeNG apague su `loading` y muestre
    // el `emptyMessage` en vez de quedarse colgado.
    this.query$
      .pipe(
        switchMap((query) =>
          this.fetchCuentas(this.searchParams(query)).pipe(
            catchError(() => of<ErpSelectOption[]>([])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));

    // Carga eager solo cuando se pide sugerir: necesita los resultados sin esperar
    // el foco para poder preseleccionar el primero.
    effect(() => {
      if (!this.suggestFirst()) return;
      this.fetchInitial().subscribe({
        next: (options) => {
          this.suggestions.set(options);
          this.applySuggestion(options);
        },
        error: () => undefined,
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
      this.delay() / 2 + 60,
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
