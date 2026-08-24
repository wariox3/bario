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
import { catchError, switchMap } from 'rxjs/operators';
import { ErpSelectDataService, ErpSelectOption } from '@reddoc/core';

@Component({
  selector: 'lib-api-autocomplete',
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
      useExisting: forwardRef(() => ErpApiAutocompleteComponent),
      multi: true,
    },
  ],
})
export class ErpApiAutocompleteComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly endpoint = input.required<string>();
  readonly searchParam = input<string>('search');
  /** Params fijos extra que se envían en cada fetch (focus y búsqueda). Ej. `{ empleado: 'True' }`. */
  readonly params = input<Record<string, string>>({});
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar…');
  readonly invalid = input<boolean>(false);
  readonly minLength = input<number>(2);
  readonly delay = input<number>(400);

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
    // el mensaje de vacío en vez de quedarse colgado.
    this.query$
      .pipe(
        switchMap((query) =>
          this.fetchOptions(query).pipe(catchError(() => of<ErpSelectOption[]>([]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));
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
   * Al vaciar el input (borrar el texto o el botón "x"), PrimeNG **no** dispara
   * la búsqueda: emite `onClear` y agenda cerrar el panel en `delay/2`. Para que
   * vuelva a verse la lista completa, relanzamos una búsqueda con query vacío
   * (`source` ≠ `'input'`, así PrimeNG no la descarta) *después* de ese cierre
   * interno. Reusa su maquinaria: marca `loading`, emite `completeMethod('')`
   * (→ `onSearch` pide `/seleccionar/` sin `search`) y reabre el panel solo.
   *
   * Con la "x" el foco vuelve al input y la recarga ya la hace `onFocusInput`, que
   * de paso cancela este timer para no duplicar la petición.
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
    this.onTouchedFn();
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
    // Tras seleccionar, PrimeNG devuelve el foco al input; eso no debe reabrir el panel.
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    this.ac?.search(undefined, '', 'focus');
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    this.query$.next(event.query?.trim() ?? '');
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  private fetchOptions(query: string) {
    const params = query ? { ...this.params(), [this.searchParam()]: query } : this.params();
    return this.dataService
      .fetchOptions(this.endpoint(), params)
      .pipe(takeUntilDestroyed(this.destroyRef));
  }
}
