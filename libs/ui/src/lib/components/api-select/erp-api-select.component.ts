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
import { SelectModule } from 'primeng/select';
import { ErpSelectDataService, ErpSelectOption } from '@reddoc/core';

@Component({
  selector: 'lib-api-select',
  standalone: true,
  imports: [SelectModule, FormsModule],
  template: `
    <p-select
      [inputId]="inputId()"
      [options]="options()"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      (onBlur)="onTouchedFn()"
      [placeholder]="placeholder()"
      [disabled]="disabled() || loading()"
      [invalid]="invalid()"
      [loading]="loading()"
      optionLabel="nombre"
      dataKey="id"
      appendTo="body"
      [fluid]="true"
    >
      @if (displayWith(); as format) {
        <ng-template #selectedItem let-option>{{ format(option) }}</ng-template>
        <ng-template #item let-option>{{ format(option) }}</ng-template>
      }
    </p-select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ErpApiSelectComponent),
      multi: true,
    },
  ],
})
export class ErpApiSelectComponent implements ControlValueAccessor {
  private readonly dataService = inject(ErpSelectDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly endpoint = input.required<string>();
  readonly params = input<Record<string, string>>({});
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Selecciona…');
  readonly invalid = input<boolean>(false);
  /** Posición (0-based) a auto-seleccionar cuando cargan las opciones y el control está vacío. `null` lo desactiva. */
  readonly suggestedIndex = input<number | null>(null);
  /**
   * Formatea la etiqueta de la opción (seleccionada y en el desplegable). Por
   * default se muestra `nombre`; pásalo para componer otros campos, p. ej.
   * `(o) => \`${o.id} - ${o.nombre}\``. La opción puede tipar campos extra del
   * endpoint vía el genérico `T`.
   */
  readonly displayWith = input<((option: ErpSelectOption) => string) | null>(null);

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly options = signal<ErpSelectOption[]>([]);
  readonly loading = signal(false);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;

  constructor() {
    effect(() => {
      // Sin fetch mientras el control está deshabilitado (p. ej. un select en
      // cascada cuyo padre aún no se eligió): evita consultas prematuras y se
      // re-dispara solo cuando se habilita. Si hay un valor seleccionado (caso
      // de un select bloqueado en edición), se siembra como única opción para
      // que el p-select pueda pintar su label —sin la opción en la lista, el
      // valor saldría en blanco—. Sin valor (cascada) queda vacío, igual que antes.
      if (this.disabled()) {
        const current = this.value();
        this.options.set(current ? [current] : []);
        return;
      }
      const params = this.params();
      const endpoint = this.endpoint();
      this.loading.set(true);
      this.dataService
        .fetchOptions(endpoint, params)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (options) => {
            this.options.set(options);
            this.loading.set(false);
            this.applySuggestion(options);
          },
          error: () => {
            this.options.set([]);
            this.loading.set(false);
          },
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
  }

  /**
   * Sugiere una opción por defecto por posición cuando el control está vacío.
   * No pisa una selección existente ni un valor cargado en edición. El índice
   * nulo o fuera de rango no hace nada.
   */
  private applySuggestion(options: ErpSelectOption[]): void {
    const index = this.suggestedIndex();
    if (index === null || this.value() !== null) return;
    const option = options[index];
    if (option) this.onValueChange(option);
  }
}
