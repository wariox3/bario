import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import {
  I18nService,
  getOperatorDef,
  getOperatorsForType,
  type FilterCondition,
  type FilterField,
  type FilterFieldType,
  type FilterValueKind,
} from '@reddoc/core';
import {
  draftToConditions,
  fieldTypeOf,
  initialDraft,
  newRowForField,
  type DraftRow,
} from './data-filter.logic';

/** Opción `{label, value}` para los `<p-select>` de propiedad / operador. */
interface SelectOption {
  readonly label: string;
  readonly value: string;
}

/**
 * Constructor de filtros reusable (modal centrado).
 *
 * **Componente tonto / controlado**: recibe los campos filtrables (`fields`) y
 * los filtros activos (`value`); emite `apply` con el nuevo `FilterCondition[]`.
 * No conoce HTTP, ni `localStorage`, ni el dominio — la persistencia y la
 * recarga son responsabilidad del host (igual que `<lib-data-table>`).
 *
 * Toda la semántica de operadores (qué aplica a cada tipo, si toma valor, cómo
 * se traduce al backend) vive en `@reddoc/core` (`FILTER_OPERATORS` +
 * `buildListBody`); este componente solo arma la UI sobre ese catálogo, por lo
 * que sumar un operador o un tipo no requiere tocarlo.
 *
 * Ejemplo:
 * ```html
 * <lib-data-filter-modal
 *   [fields]="filterFields"
 *   [value]="activeFilters()"
 *   [(visible)]="filtersVisible"
 *   (apply)="onFiltersApply($event)"
 * />
 * ```
 */
@Component({
  selector: 'lib-data-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, SelectModule, InputTextModule, ButtonModule],
  templateUrl: './data-filter-modal.component.html',
  styleUrl: './data-filter-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataFilterModalComponent {
  // ── API pública ─────────────────────────────────────────────────────────
  /** Campos filtrables de la entidad. */
  readonly fields = input.required<readonly FilterField[]>();
  /** Filtros activos actuales (para editar). El modal no los muta directamente. */
  readonly value = input<readonly FilterCondition[]>([]);
  /** Control de visibilidad (two-way: `[(visible)]`). */
  readonly visible = input<boolean>(false);
  /**
   * Fila a enfocar al abrir (la píldora que la persona tocó). Su valor queda
   * seleccionado para reescribirlo y dar Enter; si la fila no toma valor, el
   * foco va a su operador. `null` = la última fila, como al abrir con el botón.
   */
  readonly focusRow = input<number | null>(null);
  readonly visibleChange = output<boolean>();
  /** Emitido al confirmar; entrega el nuevo conjunto de condiciones. */
  readonly apply = output<readonly FilterCondition[]>();

  // ── Claves i18n (overridables) ────────────────────────────────────────────
  readonly titleKey = input<string>('common.filters.title');
  readonly subtitleKey = input<string>('common.filters.subtitle');

  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly i18n = inject<I18nService<unknown>>(I18nService);

  // ── Estado interno ────────────────────────────────────────────────────────
  protected readonly draft = signal<readonly DraftRow[]>([]);

  /** Inputs de valor en el DOM (uno por fila con valor editable). */
  private readonly valueInputs = viewChildren<ElementRef<HTMLInputElement>>('valueInput');
  /** Selects de operador; reciben el foco cuando la fila no toma valor. */
  private readonly operatorSelects = viewChildren('operatorSelect', { read: ElementRef });
  /** Índice de la fila que debe recibir foco al renderizarse; `null` = ninguno. */
  private readonly focusRowIndex = signal<number | null>(null);
  /** Si el foco pendiente viene de una píldora: entonces se selecciona el valor. */
  private readonly selectOnFocus = signal(false);
  /**
   * Fila cuyo campo u operador cambió con el panel del selector abierto. Al
   * cerrarse ese panel el foco salta a su valor. No se salta en el cambio
   * mismo: con el selector cerrado las flechas cambian la opción una a una, y
   * saltar ahí le robaría el foco a quien recorre opciones con el teclado.
   */
  private changedRow: number | null = null;

  constructor() {
    // Al abrir, hidrata el borrador desde los filtros activos (o con una
    // condición lista si no hay ninguno). Se hace en un effect (no en input
    // setter) porque `value`/`fields` son signals.
    effect(() => {
      if (!this.visible()) return;
      const rows = initialDraft(this.value(), this.fields());
      this.draft.set(rows);
      // El foco va al valor de la fila pedida (la píldora tocada) o, si no, al
      // de la última, que es la que se suele editar. El diálogo no lo pone
      // (`focusOnShow` apagado): le daría el foco al select de propiedad
      // después de la animación, pisando este.
      untracked(() => {
        const asked = this.focusRow();
        const target = asked !== null && asked < rows.length ? asked : rows.length - 1;
        this.selectOnFocus.set(asked !== null && asked < rows.length);
        this.focusRowIndex.set(target >= 0 ? target : null);
      });
    });

    // UX: al añadir una condición, mover el foco a su input de valor cuando
    // aparezca en el DOM. Depende de `valueInputs()` (cambia al renderizarse la
    // fila nueva); `focusRowIndex` se lee en untracked para no crear ciclos.
    effect(() => {
      this.valueInputs();
      this.operatorSelects();
      untracked(() => this.applyPendingFocus());
    });
  }

  /**
   * Al terminar de abrirse el diálogo. Hace falta además del effect: el
   * diálogo conserva sus campos entre aperturas, así que al reabrir
   * `valueInputs()` no cambia y el effect no vuelve a correr. Sin esto, el foco
   * solo caía bien la primera vez.
   */
  protected onDialogShow(): void {
    this.applyPendingFocus();
  }

  /**
   * Enfoca la fila pendiente (`focusRowIndex`) si ya está en el DOM: su valor,
   * seleccionado cuando viene de una píldora, o su operador si no toma valor.
   */
  private applyPendingFocus(): void {
    const target = this.focusRowIndex();
    if (target === null) return;
    const input = this.valueInputs().find(
      (ref) => ref.nativeElement.dataset['row'] === String(target),
    );
    if (input) {
      this.focusRowIndex.set(null);
      input.nativeElement.focus();
      if (this.selectOnFocus()) input.nativeElement.select();
      return;
    }
    // Fila sin valor («está vacío», booleanos): lo único editable es el
    // operador. El elemento enfocable del p-select es su combobox interno.
    const row = this.draft()[target];
    if (!row || this.valueKindFor(row) !== 'none') return;
    const select = this.operatorSelects()[target]?.nativeElement as HTMLElement | undefined;
    const combobox = select?.querySelector<HTMLElement>('[role="combobox"]');
    if (!combobox) return;
    this.focusRowIndex.set(null);
    combobox.focus();
  }

  // ── Opciones de los selects ─────────────────────────────────────────────
  /** Opciones del select de propiedad (recomputado al cambiar idioma o campos). */
  protected readonly fieldOptions = computed<SelectOption[]>(() => {
    const dict = this.i18n.t();
    return this.fields().map((f) => ({
      label: this.resolveKey(dict, f.displayNameKey),
      value: f.name,
    }));
  });

  /**
   * Opciones de operador memoizadas **por tipo** de campo. Mantener referencias
   * estables por tipo evita recrear el array de `<p-select [options]>` en cada
   * change detection.
   */
  private readonly operatorOptionsByType = computed<Record<FilterFieldType, SelectOption[]>>(() => {
    const dict = this.i18n.t();
    const build = (type: FilterFieldType): SelectOption[] =>
      getOperatorsForType(type).map((op) => ({
        label: this.resolveKey(dict, op.labelKey),
        value: op.id,
      }));
    return {
      string: build('string'),
      number: build('number'),
      boolean: build('boolean'),
      date: build('date'),
    };
  });

  /** Opciones de operador para la fila indicada (según el tipo de su campo). */
  protected operatorOptionsFor(row: DraftRow): SelectOption[] {
    return this.operatorOptionsByType()[fieldTypeOf(this.fields(), row.field)];
  }

  /** Control de valor a renderizar para la fila (`'none'` ⇒ sin input). */
  protected valueKindFor(row: DraftRow): FilterValueKind {
    return getOperatorDef(fieldTypeOf(this.fields(), row.field), row.opId)?.valueKind ?? 'text';
  }

  // ── Mutaciones del borrador (inmutables) ──────────────────────────────────
  protected addCondition(): void {
    const first = this.fields()[0];
    if (!first) return;
    this.draft.update((rows) => [...rows, newRowForField(first)]);
    // Enfocar el input de la fila recién agregada (la última).
    this.selectOnFocus.set(false);
    this.focusRowIndex.set(this.draft().length - 1);
  }

  protected removeCondition(index: number): void {
    this.draft.update((rows) => rows.filter((_, i) => i !== index));
  }

  protected clearAll(): void {
    this.draft.set([]);
  }

  /** Se abrió el panel de un selector de la fila: los cambios cuentan desde aquí. */
  protected onSelectShow(): void {
    this.changedRow = null;
  }

  /**
   * Se cerró el panel de un selector. Si en esa apertura se eligió otra opción,
   * el foco pasa al valor de la fila (o al operador si la fila no toma valor),
   * que es lo siguiente que se edita. Cerrar con Escape o clic fuera no salta.
   */
  protected onSelectHide(index: number): void {
    if (this.changedRow !== index) return;
    this.changedRow = null;
    this.selectOnFocus.set(true);
    this.focusRowIndex.set(index);
    // Si el input de valor no cambió de tipo, ya está en el DOM y el effect no
    // va a correr; si cambió (texto → fecha), lo enfoca el effect al aparecer.
    this.applyPendingFocus();
  }

  protected onFieldChange(index: number, fieldName: string): void {
    const field = this.fields().find((f) => f.name === fieldName);
    if (!field) return;
    this.changedRow = index;
    // Cambiar de propiedad resetea operador (al primero del nuevo tipo) y valor.
    const next = newRowForField(field);
    this.draft.update((rows) => rows.map((row, i) => (i === index ? next : row)));
  }

  protected onOperatorChange(index: number, opId: string): void {
    this.changedRow = index;
    this.draft.update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        const def = getOperatorDef(fieldTypeOf(this.fields(), row.field), opId);
        // Si el nuevo operador no toma valor, limpiamos el input.
        return { ...row, opId, value: def?.valueKind === 'none' ? '' : row.value };
      }),
    );
  }

  protected onValueChange(index: number, value: unknown): void {
    // `input[type=number]`/`date` usan value-accessors que emiten `number`/`null`,
    // no `string`. Normalizamos en el borde para que `DraftRow.value` siga siendo
    // siempre `string` y la lógica de conversión no falle (`.trim()`).
    const normalized = String(value ?? '');
    this.draft.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, value: normalized } : row)),
    );
  }

  // ── Acciones del footer ───────────────────────────────────────────────────
  protected applyFilters(): void {
    this.apply.emit(draftToConditions(this.draft(), this.fields()));
    this.close();
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  protected onVisibleChange(open: boolean): void {
    // Cerrar con la X / máscara no aplica cambios (igual que "Cancelar").
    this.visibleChange.emit(open);
  }

  protected translate(key: string): string {
    return this.resolveKey(this.i18n.t(), key);
  }

  // ── Internos ──────────────────────────────────────────────────────────────
  /** Resuelve una clave i18n con notación de punto; devuelve la clave si falta. */
  private resolveKey(dict: unknown, key: string): string {
    const parts = key.split('.');
    let current: unknown = dict;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }
}
