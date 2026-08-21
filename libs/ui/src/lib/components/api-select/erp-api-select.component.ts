import {
  ChangeDetectionStrategy,
  Component,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
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
    effect((onCleanup) => {
      const disabled = this.disabled();
      // Habilitado, el valor cambia con cada selección del usuario: se lee sin
      // trackear para no volver a pedir el catálogo entero en cada clic.
      // Deshabilitado solo lo cambia `writeValue` — la precarga por id de un
      // form que llega **después** del disable—, y ahí sí hay que reaccionar:
      // sin el re-disparo, ese valor tardío se quedaría sin catálogo que le
      // ponga etiqueta.
      const current = disabled ? this.value() : untracked(() => this.value());

      // Cascada (deshabilitado porque su padre aún no se eligió): no hay valor
      // que pintar ni motivo para consultar. Se re-dispara al habilitarse.
      if (disabled && !current) {
        this.options.set([]);
        return;
      }

      // Deshabilitado **con** valor (select bloqueado en edición): se siembra
      // para que el p-select tenga qué pintar ya mismo, pero se pide el
      // catálogo igual. Un valor cargado por id —`{ id, nombre: '' }`, como lo
      // arma quien solo recibe la FK del backend— no trae etiqueta: sin el
      // catálogo el campo se ve **vacío**, que es peor que verse deshabilitado.
      if (disabled && current) this.options.set([current]);

      const params = this.params();
      const endpoint = this.endpoint();
      this.loading.set(true);
      const fetch = this.dataService.fetchOptions(endpoint, params).subscribe({
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
      // Si el efecto se re-dispara con una consulta en vuelo, la vieja se
      // cancela: su respuesta podía llegar última y pisar las opciones del
      // endpoint/params vigentes. El cleanup corre también al destruir.
      onCleanup(() => fetch.unsubscribe());
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
