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
import { formatFechaCorta, type ErpSelectOption } from '@reddoc/core';
import {
  DocumentoReferenciaService,
  type DocumentoReferenciaApi,
} from './documento-referencia.service';

/** Opción del desplegable: la etiqueta del control más el tipo, que se pinta debajo. */
interface ReferenciaOption extends ErpSelectOption {
  readonly tipo: string;
}

/** Etiqueta de un documento referenciable: `número - fecha` (como el legacy). */
function toReferenciaOption(doc: DocumentoReferenciaApi): ReferenciaOption {
  const numero = doc.numero != null && doc.numero !== '' ? String(doc.numero) : `#${doc.id}`;
  const fecha = formatFechaCorta(doc.fecha, '');
  return {
    id: doc.id,
    nombre: fecha ? `${numero} - ${fecha}` : numero,
    tipo: doc.documento_tipo_nombre ?? '',
  };
}

/**
 * Selector **con búsqueda** del documento que referencia una nota (crédito o
 * débito): los documentos del contacto de la cabecera de la clase indicada, vía
 * `general/documento/seleccionar-referencia/`. Al enfocar lista sin filtro; al
 * teclear busca en el servidor (`search`), así un cliente con muchas facturas no
 * depende de un desplegable precargado.
 *
 * Sin contacto no consulta: la nota primero elige el cliente y el form deshabilita
 * el control mientras tanto. Emite un `ErpSelectOption` (`{ id, nombre }`), el
 * mismo shape que ya guarda el control `documento_referencia`.
 */
@Component({
  selector: 'app-documento-referencia-select',
  standalone: true,
  imports: [AutoCompleteModule, FormsModule],
  template: `
    <p-autocomplete
      [inputId]="inputId()"
      [ngModel]="value()"
      (onSelect)="onValueChange($event.value)"
      (onClear)="onValueChange(null)"
      (onBlur)="onBlurred()"
      [suggestions]="suggestions()"
      (completeMethod)="onSearch($event)"
      (onFocus)="onFocusInput()"
      optionLabel="nombre"
      dataKey="id"
      [forceSelection]="true"
      [minLength]="0"
      [delay]="300"
      [placeholder]="placeholder()"
      [emptyMessage]="emptyMessage()"
      [showEmptyMessage]="true"
      [disabled]="disabled()"
      [invalid]="invalid()"
      [fluid]="true"
      [showClear]="true"
      appendTo="body"
      autocomplete="off"
    >
      <ng-template #item let-opt>
        <span class="flex min-w-0 flex-col">
          <span class="truncate">{{ opt.nombre }}</span>
          @if (opt.tipo) {
            <span class="truncate text-[0.72rem] text-brand-muted">{{ opt.tipo }}</span>
          }
        </span>
      </ng-template>
    </p-autocomplete>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ErpDocumentoReferenciaSelectComponent),
      multi: true,
    },
  ],
})
export class ErpDocumentoReferenciaSelectComponent implements ControlValueAccessor {
  private readonly service = inject(DocumentoReferenciaService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(AutoComplete) private readonly ac?: AutoComplete;

  /** Contacto de la cabecera: acota la búsqueda a sus documentos. */
  readonly contactoId = input<number | null>(null);
  /** Clase del documento referenciable (`documento_clase_id`, p. ej. `100` = factura de venta). */
  readonly documentoClaseId = input.required<number>();
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('');
  readonly emptyMessage = input<string>('');
  readonly invalid = input<boolean>(false);

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ReferenciaOption[]>([]);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  /** Tras elegir, PrimeNG devuelve el foco al input: eso no debe reabrir el panel. */
  private skipNextFocus = false;

  /** Términos de búsqueda; `switchMap` deja ganar la última consulta. */
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        switchMap((search) => {
          const contactoId = this.contactoId();
          if (contactoId == null) return of<ReferenciaOption[]>([]);
          return this.service.buscar(contactoId, this.documentoClaseId(), search).pipe(
            map((docs) => docs.map(toReferenciaOption)),
            catchError(() => of<ReferenciaOption[]>([])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.suggestions.set(options));
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
    if (next !== null) this.skipNextFocus = true;
  }

  /** Cada enfoque lista los documentos sin el filtro de la búsqueda anterior. */
  onFocusInput(): void {
    if (this.skipNextFocus) {
      this.skipNextFocus = false;
      return;
    }
    this.ac?.search(undefined, '', 'focus');
  }

  onSearch(event: AutoCompleteCompleteEvent): void {
    this.query$.next(event.query?.trim() ?? '');
  }

  /**
   * `forceSelection` vacía el input si lo tecleado no coincide con una opción, pero
   * con `[ngModel]` de una vía no avisa hacia afuera: sin esto el control seguiría
   * con la factura anterior mientras el input se ve vacío. Con el panel abierto el
   * blur viene de un clic sobre una opción y la selección ya está en camino.
   */
  onBlurred(): void {
    if (this.value() !== null && !this.ac?.overlayVisible) {
      const input: HTMLInputElement | undefined = this.ac?.inputEL?.nativeElement;
      if (input && input.value.trim() === '') this.onValueChange(null);
    }
    this.onTouchedFn();
  }
}
