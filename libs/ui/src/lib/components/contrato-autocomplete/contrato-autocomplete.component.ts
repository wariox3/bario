import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  forwardRef,
  inject,
  input,
  signal,
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
 * Opción de contrato seleccionado. Igual que `EmpleadoOption`, conserva la
 * identificación del empleado del contrato como **campo separado** (no la
 * concatena en la etiqueta) para poder pintarla en su propio addon al lado del
 * input.
 */
export interface ContratoOption {
  readonly id: number;
  readonly nombre: string;
  readonly numero_identificacion: string;
}

/**
 * Fila cruda del endpoint `humano/contrato/seleccionar/`.
 *
 * Forma real: `{ id, contacto, contacto_nombre, fecha_desde, fecha_hasta,
 * estado_terminado }`. La etiqueta es `contacto_nombre` (nombre del empleado del
 * contrato). La identificación **no viene** en este endpoint hoy; si el backend
 * la agrega (ej. `contacto_numero_identificacion`), el addon la pinta solo.
 */
interface ContratoApiRow {
  readonly id: number;
  readonly contacto_nombre?: string;
  readonly contacto_numero_identificacion?: string;
  readonly nombre?: string;
}

/** Mapea la fila cruda a la opción tipada del control (nombre + identificación separados). */
function toOption(row: ContratoApiRow): ContratoOption {
  return {
    id: row.id,
    nombre: row.contacto_nombre ?? row.nombre ?? '',
    numero_identificacion: row.contacto_numero_identificacion ?? '',
  };
}

/**
 * Selector de contrato con identificación al lado (input group).
 *
 * Autocomplete sobre `humano/contrato/seleccionar/?estado_terminado=False` que:
 * - Recarga la lista completa (sin término de búsqueda) en cada enfoque y cada vez
 *   que se vacía el input, para que el desplegable no quede pegado al último filtro.
 * - Busca con el parámetro genérico DRF `?search=<query>` (el back resuelve contra
 *   el nombre del empleado del contrato).
 * - Muestra cada contrato a **dos líneas** (nombre + `C.C. <identificación>`) para
 *   desambiguar homónimos.
 * - Pinta la cédula del empleado del contrato elegido en un **addon pegado** a la
 *   derecha, siempre visible (guion `—` cuando no hay selección).
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `ContratoOption`
 * (`{ id, nombre, numero_identificacion }`). El payload solo necesita el `id`; la
 * identificación viaja para poder pintar el addon (en edición llega vacía si el
 * backend no la devuelve en el read-model).
 *
 * `endpoint`/`extraParams` son inputs con default → reusable en otros masters de
 * Humano sin tocar el componente.
 */
@Component({
  selector: 'lib-contrato-autocomplete',
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
      useExisting: forwardRef(() => ContratoAutocompleteComponent),
      multi: true,
    },
  ],
})
export class ContratoAutocompleteComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Buscar contrato…');
  readonly invalid = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados');
  readonly minLength = input<number>(0);
  readonly delay = input<number>(300);
  /** Etiqueta accesible del addon de identificación. */
  readonly idAriaLabel = input<string>('Identificación');

  /** Endpoint de selección. Default: contratos; overridable para otros masters. */
  readonly endpoint = input<string>('/humano/contrato/seleccionar/');
  /** Filtros fijos extra. Default: solo contratos vigentes. */
  readonly extraParams = input<Record<string, ParamValue>>({ estado_terminado: 'False' });

  readonly value = signal<ContratoOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ContratoOption[]>([]);

  /** Cédula del empleado del contrato elegido; alimenta el addon. */
  readonly identificacion = computed(() => this.value()?.numero_identificacion || null);

  private onChangeFn: (value: ContratoOption | null) => void = () => undefined;
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
          this.fetchContratos(query).pipe(catchError(() => of<ContratoOption[]>([]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));
  }

  writeValue(value: ContratoOption | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: ContratoOption | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: ContratoOption | null): void {
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

  private fetchContratos(query: string) {
    return this.dataService
      .fetchOptions<ContratoApiRow>(this.endpoint(), {
        ...this.extraParams(),
        search: query,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((rows) => rows.map(toOption)),
      );
  }
}
