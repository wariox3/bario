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
import { CIUDAD_FUENTE, Ciudad, CiudadFuente, CiudadService, formatCiudad } from '@reddoc/core';

/**
 * Ciudad lista para el desplegable: la del catálogo más la `etiqueta` que ve el
 * usuario (`Albania — La Guajira`). El valor que viaja al formulario la conserva,
 * así el campo muestra el departamento tanto al elegir como al reabrir.
 */
export interface CiudadOpcion extends Ciudad {
  readonly etiqueta: string;
}

/** Agrega la etiqueta visible a una ciudad del catálogo. */
function aOpcion(ciudad: Ciudad): CiudadOpcion {
  return { ...ciudad, etiqueta: formatCiudad(ciudad.nombre, ciudad.departamento_nombre) };
}

@Component({
  selector: 'lib-ciudad-autocomplete',
  standalone: true,
  imports: [AutoCompleteModule, FormsModule],
  template: `
    <div class="relative w-full">
      <i
        class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-[0.78rem] text-brand-muted pointer-events-none z-10"
        aria-hidden="true"
      ></i>
      <p-autocomplete
        [inputId]="inputId()"
        [ngModel]="value()"
        (onSelect)="onValueChange($event.value)"
        (onClear)="onCleared()"
        (onBlur)="onBlurred()"
        [suggestions]="suggestions()"
        (completeMethod)="onSearch($event)"
        (onFocus)="onFocusInput()"
        [optionLabel]="'etiqueta'"
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
        styleClass="w-full"
        inputStyleClass="w-full !pl-9"
      >
        <!-- El departamento en segunda línea es lo que separa a las tres
             «Albania» del país: sin él, la lista muestra opciones idénticas. -->
        <ng-template pTemplate="item" let-ciudad>
          <div class="flex items-center gap-2 py-0.5">
            <i class="pi pi-map-marker text-[0.7rem] text-brand-muted"></i>
            <span class="flex min-w-0 flex-col">
              <span class="text-[0.85rem] leading-tight text-brand-text">{{ ciudad.nombre }}</span>
              @if (ciudad.departamento_nombre) {
                <span class="text-[0.72rem] leading-tight text-brand-muted">
                  {{ ciudad.departamento_nombre }}
                </span>
              }
            </span>
          </div>
        </ng-template>
        <ng-template pTemplate="empty">
          <span class="block px-3 py-2 text-[0.78rem] text-brand-muted">
            {{ emptyMessage() }}
          </span>
        </ng-template>
      </p-autocomplete>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CiudadAutocompleteComponent),
      multi: true,
    },
  ],
})
export class CiudadAutocompleteComponent implements ControlValueAccessor {
  private readonly ciudadService = inject(CiudadService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  /**
   * De dónde traer las ciudades. Default: el catálogo global, que es el que
   * sirve a la app de cuenta; el ERP pasa `CIUDAD_FUENTE.erp`.
   */
  readonly fuente = input<CiudadFuente>(CIUDAD_FUENTE.contenedor);

  readonly placeholder = input<string>('Buscar ciudad…');
  readonly inputId = input<string>('');
  readonly invalid = input<boolean>(false);
  readonly emptyMessage = input<string>('No se encontraron resultados');
  readonly minLength = input<number>(0);
  readonly delay = input<number>(300);

  readonly value = signal<CiudadOpcion | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<CiudadOpcion[]>([]);

  private onChangeFn: (value: CiudadOpcion | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;
  private skipNextFocus = false;
  private focused = false;
  private reopenTimer?: ReturnType<typeof setTimeout>;

  /** Términos de búsqueda (enfoque, limpieza y tecleo); la última consulta gana. */
  private readonly query$ = new Subject<string>();

  constructor() {
    // `switchMap` cancela la consulta en vuelo al llegar un término nuevo: sin él,
    // la respuesta de un prefijo corto puede llegar tarde y pisar la del término
    // completo. `catchError` deja `[]` para que PrimeNG apague su `loading`.
    this.query$
      .pipe(
        switchMap((query) =>
          this.ciudadService.search(query, this.fuente()).pipe(
            map((items) => items.map(aOpcion)),
            catchError(() => of<CiudadOpcion[]>([])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((opciones) => this.suggestions.set(opciones));

    this.destroyRef.onDestroy(() => clearTimeout(this.reopenTimer));
  }

  /**
   * El valor guardado llega con el `nombre` que el registro tenga; se le calcula
   * la `etiqueta` para que el input muestre lo mismo al reabrir que al elegir.
   */
  writeValue(value: Ciudad | null): void {
    this.value.set(value ? aOpcion(value) : null);
  }

  registerOnChange(fn: (value: CiudadOpcion | null) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onValueChange(next: CiudadOpcion | null): void {
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

  onSearch(event: AutoCompleteCompleteEvent): void {
    this.query$.next(event.query?.trim() ?? '');
  }
}
