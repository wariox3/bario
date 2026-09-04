import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MultiSelect, MultiSelectModule } from 'primeng/multiselect';
import {
  ErpSelectDataService,
  calcularImpuestosLinea,
  formatCop,
  type ParamValue,
  type TasaImpuesto,
} from '@reddoc/core';
import {
  IMPUESTO_SELECCIONAR_ENDPOINT,
  tasaFromImpuestoOption,
  type ImpuestoSeleccionarOption,
} from './impuesto-seleccionar.types';

/**
 * Selector múltiple de impuestos.
 *
 * Las opciones salen del catálogo `general/impuesto/seleccionar/`: o las trae él
 * mismo (acotadas por `params`, default `{ venta: 'True' }`) o se las pasa el
 * padre por `catalogo` cuando ya lo tiene cargado —caso de una tabla de líneas,
 * donde un fetch por fila sería absurdo y además arriesga que el pool con el que
 * la tabla **calcula** y el que la persona **elige** no sean el mismo.
 *
 * A diferencia de `app-cuenta-select`/`lib-contacto-select` (que emiten un
 * `ErpSelectOption`), este emite directamente el **array de ids**
 * (`number[]`) — el shape que espera el backend en `impuestos_ids`. Así es
 * reutilizable en cualquier documento sin mapear opción→id en el consumidor.
 *
 * **Dos variantes** (`variant`):
 *  - `campo` (default) — control de formulario normal, con su caja y su placeholder.
 *  - `celda` — para una celda de tabla: el control no tiene caja, se ve como la
 *    tira de badges de los impuestos elegidos y **un clic abre el panel**.
 *
 * En ambas, el valor se pinta como badges y cada uno trae su `×` al hover, así
 * quitar un impuesto no abre nada.
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
      (onBlur)="onTriggerBlur()"
      optionLabel="nombre"
      optionValue="id"
      dataKey="id"
      [placeholder]="placeholder()"
      [disabled]="disabled() || loading()"
      [invalid]="invalid()"
      [loading]="loading()"
      [showClear]="esCampo()"
      [showToggleAll]="false"
      [filter]="true"
      [showHeader]="true"
      [filterPlaceHolder]="filtroPlaceholder()"
      [autofocusFilter]="true"
      [resetFilterOnHide]="true"
      [styleClass]="esCampo() ? '' : 'impuesto-select__celda'"
      panelStyleClass="min-w-[20rem]"
      appendTo="body"
      [fluid]="true"
    >
      <ng-template #header>
        @if (tituloPanel()) {
          <div
            class="border-b border-[rgba(20,48,73,0.08)] px-3 pb-2 pt-3 text-[0.7rem] font-semibold text-brand-text"
          >
            {{ tituloPanel() }}
          </div>
        }
      </ng-template>

      <ng-template #selecteditems let-elegidos let-removeChip="removeChip">
        @for (opt of elegidos; track opt.id) {
          <span [class]="badgeClass()">
            {{ opt.nombre }}
            <button
              type="button"
              class="flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-transparent transition-colors group-hover/badge:text-brand-muted hover:bg-[rgba(20,48,73,0.1)]"
              [attr.aria-label]="quitarLabel() + ' ' + opt.nombre"
              (click)="removeChip(opt.id, $event)"
            >
              <i class="pi pi-times text-[0.5rem]"></i>
            </button>
          </span>
        } @empty {
          @if (!esCampo()) {
            <i class="pi pi-plus mr-1 text-[0.6rem] text-brand-muted"></i>
          }
        }
      </ng-template>

      <ng-template #item let-opt>
        <span class="min-w-0 flex-1 truncate">{{ opt.nombre }}</span>
        @if (aporteDe(opt); as aporte) {
          <span class="ml-3 shrink-0 text-[0.72rem] tabular-nums text-brand-muted">
            {{ aporte }}
          </span>
        }
      </ng-template>
    </p-multiselect>
  `,
  styles: `
    /* El valor son badges, no una línea de texto: la etiqueta del trigger deja
       de ser \`nowrap + ellipsis\` y pasa a envolver. Vale para ambas variantes. */
    :host ::ng-deep .p-multiselect-label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem;
    }

    /* Variante celda: el control no se ve hasta que lo tocás — en una tabla de
       líneas, 12 cajas de select compiten con los números. La tira de badges ES
       el control, y el hover (fondo + chevron) anuncia que se puede editar. */
    :host ::ng-deep .impuesto-select__celda {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
      border-radius: 0.375rem;
      transition: background-color 0.12s ease;
    }

    :host ::ng-deep .impuesto-select__celda .p-multiselect-label {
      padding: 0.25rem 0.375rem;
      font-size: 0.72rem;
      color: var(--brand-muted, #64748b);
    }

    :host ::ng-deep .impuesto-select__celda:not(.p-disabled):hover {
      background: rgb(240 249 255); /* sky-50 */
      border-color: transparent;
    }

    /* Chevron: fantasma en reposo, muted al hover de la celda. Es el mismo gesto
       que hacía el lápiz del popover, sin sumar un ícono aparte. */
    :host ::ng-deep .impuesto-select__celda .p-multiselect-dropdown {
      width: 1.25rem;
      color: transparent;
      transition: color 0.12s ease;
    }

    :host ::ng-deep .impuesto-select__celda:hover .p-multiselect-dropdown {
      color: var(--brand-muted, #64748b);
    }
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
  private readonly multiselect = viewChild.required(MultiSelect);

  readonly inputId = input<string>('');
  readonly placeholder = input<string>('Selecciona…');
  readonly invalid = input<boolean>(false);
  /** Filtros del endpoint. Default: impuestos de venta. Ignorado si viene `catalogo`. */
  readonly params = input<Record<string, ParamValue>>({ venta: 'True' });
  /** Presentación: control de formulario (`campo`) o celda de tabla (`celda`). */
  readonly variant = input<'campo' | 'celda'>('campo');
  /**
   * Pool de tasas ya cargado por el padre. Si viene, el componente **no consulta**
   * el catálogo: evita un fetch por fila en una tabla y garantiza que ofrece
   * exactamente los impuestos con los que el padre calcula.
   */
  readonly catalogo = input<readonly TasaImpuesto[] | null>(null);
  /**
   * Base gravable de la línea. Con ella, cada opción del panel muestra **cuánto
   * le suma o resta a esta línea** — el dato por el que se abre el panel. Sin
   * ella (o en 0) el panel muestra solo los nombres.
   */
  readonly baseLinea = input<number | null>(null);
  /** Título del panel. Vacío ⇒ el panel abre directo en el buscador. */
  readonly tituloPanel = input<string>('');
  /** Placeholder del buscador del panel. */
  readonly filtroPlaceholder = input<string>('Buscar…');
  /** Etiqueta accesible del `×` de cada badge. */
  readonly quitarLabel = input<string>('Quitar');

  readonly value = signal<number[]>([]);
  readonly disabled = signal(false);
  readonly loading = signal(false);

  /** Opciones traídas por el propio componente (vacío si el padre pasa `catalogo`). */
  private readonly fetched = signal<readonly TasaImpuesto[]>([]);

  // Copia mutable: el `options` de p-multiselect no acepta un array readonly.
  protected readonly options = computed<TasaImpuesto[]>(() => [
    ...(this.catalogo() ?? this.fetched()),
  ]);
  protected readonly esCampo = computed(() => this.variant() === 'campo');
  /** Badge de un impuesto elegido: mismo tinte navy en ambas variantes, un punto
   * más chico dentro de una celda de tabla que dentro de un campo. */
  protected readonly badgeClass = computed(
    () =>
      'group/badge inline-flex items-center gap-1 rounded-md border border-[rgba(20,48,73,0.12)] ' +
      'bg-[rgba(20,48,73,0.05)] py-0.5 pl-1.5 pr-1 font-medium leading-none text-brand-text ' +
      (this.esCampo() ? 'text-[0.78rem]' : 'text-[0.68rem]'),
  );

  private onChangeFn: (value: number[]) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;

  constructor() {
    effect(() => {
      // El padre manda el pool: no hay nada que consultar.
      if (this.catalogo() !== null) return;

      const params = this.params();
      this.loading.set(true);
      this.dataService
        .fetchOptions<ImpuestoSeleccionarOption>(IMPUESTO_SELECCIONAR_ENDPOINT, params)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (options) => {
            // La etiqueta es el nombre **extendido** ("IVA 19% ventas"), igual
            // que los badges de la línea y el resumen del documento: un solo
            // nombre por impuesto en toda la pantalla.
            this.fetched.set(options.map(tasaFromImpuestoOption));
            this.loading.set(false);
          },
          error: () => {
            this.fetched.set([]);
            this.loading.set(false);
          },
        });
    });
  }

  /**
   * Lo que ese impuesto le hace a **esta** línea, ya resuelto por el kernel de
   * cálculo. El signo hace todo el trabajo (`−` en una retención), sin color
   * propio: es el mismo idioma con el que el resumen del documento lista su
   * desglose. `null` si todavía no hay base —una línea sin ítem no tiene nada
   * que mostrar.
   */
  protected aporteDe(opt: TasaImpuesto): string | null {
    const base = this.baseLinea();
    if (base === null || base === 0) return null;
    const [{ total }] = calcularImpuestosLinea(base, [opt]);
    if (total === 0) return null;
    return `${total > 0 ? '+' : '−'} ${formatCop(Math.abs(total))}`;
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

  /**
   * Marca el control como tocado solo cuando la persona **sale** de verdad.
   *
   * Al abrir el panel, `autofocusFilter` mueve el foco al buscador y eso hace
   * saltar un `blur` interno. PrimeNG lo sabe y suprime su propio
   * `onModelTouched` (`preventModelTouched`), pero emite `onBlur` **antes** de
   * mirar esa bandera: sin este guardo, abrir el panel ya dejaría el control
   * tocado y un validador lo pintaría en rojo sin que nadie eligiera nada.
   */
  protected onTriggerBlur(): void {
    if (this.multiselect().overlayVisible) return;
    this.onTouchedFn();
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
