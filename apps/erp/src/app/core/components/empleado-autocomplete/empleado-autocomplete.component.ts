import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Subject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ErpSelectDataService, type ParamValue } from '@reddoc/core';

/**
 * Opción de empleado seleccionado. A diferencia de `ErpSelectOption`, conserva la
 * identificación como **campo separado** (no la concatena en la etiqueta) para
 * poder pintarla en su propio addon al lado del input.
 */
export interface EmpleadoOption {
  readonly id: number;
  readonly nombre: string;
  readonly numero_identificacion: string;
}

/**
 * Fila cruda del endpoint `general/contacto/seleccionar/`.
 *
 * El nombre puede llegar como `nombre_corto` (convención del master) o `nombre`
 * (etiqueta ya armada); se contemplan ambos y se cae al disponible.
 */
interface EmpleadoApiRow {
  readonly id: number;
  readonly numero_identificacion?: string;
  readonly nombre_corto?: string;
  readonly nombre?: string;
}

/** Mapea la fila cruda a la opción tipada del control (nombre + identificación separados). */
function toOption(row: EmpleadoApiRow): EmpleadoOption {
  return {
    id: row.id,
    nombre: row.nombre_corto ?? row.nombre ?? '',
    numero_identificacion: row.numero_identificacion ?? '',
  };
}

/**
 * Selector de empleado con identificación al lado (input group).
 *
 * Autocomplete sobre `general/contacto/seleccionar/?empleado=True` que:
 * - Recarga la lista completa (sin término de búsqueda) en cada enfoque y cada vez
 *   que se vacía el input, para que el desplegable no quede pegado al último filtro.
 * - Busca con el parámetro genérico DRF `?search=<query>` (el back resuelve contra
 *   identificación y nombre).
 * - Muestra cada empleado a **dos líneas** (nombre + `C.C. <identificación>`) para
 *   desambiguar homónimos.
 * - Pinta la cédula del empleado elegido en un **addon pegado** a la derecha, siempre
 *   visible (guion `—` cuando no hay selección).
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `EmpleadoOption`
 * (`{ id, nombre, numero_identificacion }`). El payload solo necesita el `id`; la
 * identificación viaja para poder pintar el addon (también en modo edición).
 *
 * `endpoint`/`extraParams` son inputs con default → reusable en otros masters de
 * Humano (p. ej. nómina) sin tocar el componente.
 */
@Component({
  selector: 'app-empleado-autocomplete',
  standalone: true,
  imports: [AutoCompleteModule, InputGroupModule, InputGroupAddonModule, FormsModule],
  template: `
    <p-inputgroup>
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
      >
        <ng-template pTemplate="item" let-option>
          <div class="flex flex-col gap-0.5 py-0.5">
            <span class="text-[0.85rem] leading-tight text-brand-text">{{ option.nombre }}</span>
            @if (option.numero_identificacion) {
              <span class="font-mono text-[0.72rem] leading-tight tabular-nums text-brand-muted">
                C.C. {{ option.numero_identificacion }}
              </span>
            }
          </div>
        </ng-template>
      </p-autocomplete>

      <p-inputgroup-addon>
        <span
          class="flex items-center gap-1.5 text-brand-muted"
          [attr.aria-label]="idAriaLabel() + (identificacion() ? ': ' + identificacion() : '')"
        >
          <i class="pi pi-id-card text-[0.85rem]"></i>
          <span class="font-mono text-[0.8rem] tabular-nums">{{ identificacion() || '—' }}</span>
        </span>
      </p-inputgroup-addon>
    </p-inputgroup>
  `,
  styles: [
    `
      /* El autocomplete ocupa el espacio libre del input group; el addon se ajusta al contenido. */
      :host ::ng-deep .p-autocomplete {
        flex: 1 1 auto;
      }
      :host ::ng-deep .p-inputgroupaddon {
        white-space: nowrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EmpleadoAutocompleteComponent),
      multi: true,
    },
  ],
})
export class EmpleadoAutocompleteComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar empleado…');
  readonly invalid = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados');
  readonly minLength = input<number>(0);
  readonly delay = input<number>(300);
  /** Etiqueta accesible del addon de identificación. */
  readonly idAriaLabel = input<string>('Identificación');

  /** Endpoint de selección. Default: contactos; overridable para otros masters. */
  readonly endpoint = input<string>('/general/contacto/seleccionar/');
  /** Filtros fijos extra. Default: solo empleados. */
  readonly extraParams = input<Record<string, ParamValue>>({ empleado: 'True' });
  /**
   * Posición (0-based) a auto-seleccionar al cargar, cuando el control está vacío.
   * `null` (default) lo desactiva. No pisa una selección manual ni el valor cargado
   * en edición.
   */
  readonly suggestedIndex = input<number | null>(null);

  readonly value = signal<EmpleadoOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<EmpleadoOption[]>([]);

  /** Cédula del empleado elegido; alimenta el addon. */
  readonly identificacion = computed(() => this.value()?.numero_identificacion || null);

  private onChangeFn: (value: EmpleadoOption | null) => void = () => undefined;
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
          this.fetchEmpleados(query).pipe(catchError(() => of<EmpleadoOption[]>([]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));

    // Sugerencia opcional: auto-selecciona la opción en `suggestedIndex` al cargar
    // las primeras opciones, solo si el control sigue vacío. El valor se lee sin
    // trackear para no re-disparar el efecto al seleccionar.
    effect(() => {
      const index = this.suggestedIndex();
      if (index === null || untracked(this.value) !== null) return;
      this.fetchEmpleados('').subscribe({
        next: (options) => {
          const option = options[index];
          if (option && untracked(this.value) === null) this.onValueChange(option);
        },
        error: () => undefined,
      });
    });
  }

  writeValue(value: EmpleadoOption | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: EmpleadoOption | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: EmpleadoOption | null): void {
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

  private fetchEmpleados(query: string) {
    return this.dataService
      .fetchOptions<EmpleadoApiRow>(this.endpoint(), { ...this.extraParams(), search: query })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((rows) => rows.map(toOption)),
      );
  }
}
