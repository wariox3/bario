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
import { map } from 'rxjs/operators';
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
 * - Trae los primeros resultados al enfocar (sin término de búsqueda).
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

  onFocusInput(): void {
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    if (this.suggestions().length > 0) {
      this.ac?.show();
      return;
    }
    this.fetchContratos('').subscribe((options) => {
      this.suggestions.set(options);
      setTimeout(() => this.ac?.show());
    });
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    const query = event.query?.trim() ?? '';
    this.fetchContratos(query).subscribe((options) => this.suggestions.set(options));
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
