import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SELECT_ENDPOINTS, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent } from '../api-select/erp-api-select.component';

/**
 * Selector de asesor.
 *
 * Envuelve `<lib-api-select>` sobre `general/asesor/seleccionar/` con el
 * `displayWith` ya cableado. Ese endpoint **rompe la convención `{ id, nombre }`**
 * y devuelve `nombre_corto`; el `<p-select>` de `lib-api-select` pinta `nombre`,
 * así que sin el `displayWith` las opciones saldrían en blanco. Centralizar el fix
 * evita que cada formulario nuevo tenga que recordarlo (bug histórico repetido en
 * contacto, factura POS y remisión).
 *
 * Implementa `ControlValueAccessor`: el valor del control es un `ErpSelectOption`
 * (`{ id, nombre }`). Para hidratar en edición, el mapper del documento debe
 * sembrar `nombre` con el `asesor_nombre` del read-model (el `<p-select>` necesita
 * la opción seleccionada en su lista para pintar la etiqueta).
 */
@Component({
  selector: 'lib-asesor-select',
  standalone: true,
  imports: [ErpApiSelectComponent, FormsModule],
  template: `
    <lib-api-select
      [inputId]="inputId()"
      [placeholder]="placeholder()"
      [invalid]="invalid()"
      [endpoint]="endpoint"
      [displayWith]="asesorLabel"
      [ngModel]="value()"
      [disabled]="disabled()"
      (ngModelChange)="onValueChange($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ErpAsesorSelectComponent),
      multi: true,
    },
  ],
})
export class ErpAsesorSelectComponent implements ControlValueAccessor {
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Selecciona…');
  readonly invalid = input<boolean>(false);

  /** Endpoint fijo del catálogo de asesores. */
  protected readonly endpoint = SELECT_ENDPOINTS.asesor;

  /**
   * El endpoint `asesor/seleccionar/` devuelve `nombre_corto` en vez de `nombre`;
   * sin esto el `<p-select>` (que pinta `nombre`) mostraría la opción en blanco.
   */
  protected readonly asesorLabel = (option: ErpSelectOption): string =>
    (option['nombre_corto'] as string | undefined) ?? option.nombre ?? '';

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

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
    this.onTouchedFn();
  }
}
