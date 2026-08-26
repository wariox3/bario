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
  /** Campos extra del contacto (p. ej. `plazo_pago_id`, `precio_id`) que el consumidor puede leer. */
  readonly [key: string]: unknown;
}

/** Endpoint de selección de contactos. */
const ENDPOINT = '/general/contacto/seleccionar/';

/**
 * Construye la etiqueta visible `identificación - nombre` (cae a lo disponible) y
 * conserva los campos extra del endpoint (`plazo_pago_id`, `precio_id`, etc.) para
 * que el consumidor pueda derivar valores por defecto tras seleccionar el contacto.
 */
function toOption(row: ContactoApiRow): ErpSelectOption {
  const name = row.nombre_corto ?? row.nombre ?? '';
  const label = [row.numero_identificacion, name].filter(Boolean).join(' - ');
  return { ...row, id: row.id, nombre: label || name };
}

/**
 * Selector de contactos.
 *
 * Autocomplete sobre `general/contacto/seleccionar/` que:
 * - Recarga la lista completa (sin término de búsqueda) en cada enfoque y cada vez
 *   que se vacía el input, para que el desplegable no quede pegado al último filtro.
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
          this.fetchContactos(query).pipe(catchError(() => of<ErpSelectOption[]>([]))),
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

  private fetchContactos(query: string) {
    return this.dataService
      .fetchOptions<ContactoApiRow>(ENDPOINT, { ...this.extraParams(), search: query })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((rows) => rows.map(toOption)),
      );
  }
}
