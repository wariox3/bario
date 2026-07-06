import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ErpSelectDataService, ErpSelectOption, type ParamValue } from '@reddoc/core';

/** Endpoint de selección de impuestos. */
const ENDPOINT = '/general/impuesto/seleccionar/';

/**
 * Selector múltiple de impuestos.
 *
 * Carga las opciones de `general/impuesto/seleccionar/` (acotadas por `params`,
 * default `{ venta: 'True' }`) y las presenta en un `p-multiselect` con chips.
 *
 * A diferencia de `app-cuenta-select`/`lib-contacto-select` (que emiten un
 * `ErpSelectOption`), este emite directamente el **array de ids**
 * (`number[]`) — el shape que espera el backend en `impuestos_ids`. Así es
 * reutilizable en cualquier documento sin mapear opción→id en el consumidor.
 */
@Component({
  selector: 'app-impuesto-select',
  standalone: true,
  imports: [MultiSelectModule, FormsModule],
  template: `
    <p-multiselect
      [inputId]="inputId()"
      [options]="options()"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      (onBlur)="onTouchedFn()"
      optionLabel="nombre"
      optionValue="id"
      dataKey="id"
      [display]="display()"
      [maxSelectedLabels]="maxSelectedLabels()"
      [placeholder]="placeholder()"
      [disabled]="disabled() || loading()"
      [invalid]="invalid()"
      [loading]="loading()"
      [showClear]="true"
      appendTo="body"
      [fluid]="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ErpImpuestoSelectComponent),
      multi: true,
    },
  ],
})
export class ErpImpuestoSelectComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Selecciona…');
  readonly invalid = input<boolean>(false);
  /** Modo de presentación del valor: `chip` (default) o `comma` (slim, para tablas). */
  readonly display = input<'chip' | 'comma'>('chip');
  /** Máximo de etiquetas antes de colapsar a "{n} ítems". 0 = siempre colapsado. */
  readonly maxSelectedLabels = input<number>(3);
  /** Filtros del endpoint. Default: impuestos de venta. */
  readonly params = input<Record<string, ParamValue>>({ venta: 'True' });

  readonly value = signal<number[]>([]);
  readonly disabled = signal(false);
  readonly options = signal<ErpSelectOption[]>([]);
  readonly loading = signal(false);

  private onChangeFn: (value: number[]) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;

  constructor() {
    effect(() => {
      const params = this.params();
      this.loading.set(true);
      this.dataService
        .fetchOptions(ENDPOINT, params)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (options) => {
            this.options.set(options);
            this.loading.set(false);
          },
          error: () => {
            this.options.set([]);
            this.loading.set(false);
          },
        });
    });
  }

  writeValue(value: number[] | null): void {
    this.value.set(value ?? []);
  }

  registerOnChange(fn: (value: number[]) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: number[] | null): void {
    const value = next ?? [];
    this.value.set(value);
    this.onChangeFn(value);
  }
}
