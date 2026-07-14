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
import { map } from 'rxjs/operators';
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
 * Autocomplete sobre `general/contacto/seleccionar/?empleado=true` que:
 * - Trae los primeros resultados al enfocar (sin término de búsqueda).
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
  readonly extraParams = input<Record<string, ParamValue>>({ empleado: 'true' });
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

  constructor() {
    // Sugerencia opcional: auto-selecciona la opción en `suggestedIndex` al cargar
    // las primeras opciones, solo si el control sigue vacío. El valor se lee sin
    // trackear para no re-disparar el efecto al seleccionar.
    effect(() => {
      const index = this.suggestedIndex();
      if (index === null || untracked(this.value) !== null) return;
      this.fetchEmpleados('').subscribe((options) => {
        const option = options[index];
        if (option && untracked(this.value) === null) this.onValueChange(option);
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

  onFocusInput(): void {
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    if (this.suggestions().length > 0) {
      this.ac?.show();
      return;
    }
    this.fetchEmpleados('').subscribe((options) => {
      this.suggestions.set(options);
      setTimeout(() => this.ac?.show());
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() ?? '';
    this.fetchEmpleados(query).subscribe((options) => this.suggestions.set(options));
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
