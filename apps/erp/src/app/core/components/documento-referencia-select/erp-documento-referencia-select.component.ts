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
import type { CarteraTipo } from '@erp/core/module-config';
import {
  DocumentoReferenciaService,
  type DocumentoReferenciaApi,
} from './documento-referencia.service';

/** Etiqueta de un documento referenciable: `número - fecha` (como el legacy). */
function toReferenciaOption(doc: DocumentoReferenciaApi): ErpSelectOption {
  const numero = doc.numero != null && doc.numero !== '' ? String(doc.numero) : `#${doc.id}`;
  const fecha = formatFechaCorta(doc.fecha, '');
  return { id: doc.id, nombre: fecha ? `${numero} - ${fecha}` : numero };
}

/**
 * Selector **con búsqueda** del documento que referencia una nota (crédito o
 * débito): las facturas aprobadas del contacto de la cabecera. Al enfocar lista
 * las más recientes; al teclear un número busca esa factura en el servidor, así
 * un cliente con muchas facturas no depende de un desplegable precargado.
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
    />
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

  /** Contacto de la cabecera: acota la búsqueda a sus facturas. */
  readonly contactoId = input<number | null>(null);
  /** Familia de la nota: `cobrar` (venta) o `pagar` (compra). */
  readonly cartera = input<CarteraTipo>('cobrar');
  readonly inputId = input<string>('');
  readonly placeholder = input<string>('');
  readonly emptyMessage = input<string>('');
  readonly invalid = input<boolean>(false);

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly suggestions = signal<ErpSelectOption[]>([]);

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  /** Tras elegir, PrimeNG devuelve el foco al input: eso no debe reabrir el panel. */
  private skipNextFocus = false;

  /** Términos de búsqueda; `switchMap` deja ganar la última consulta. */
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        switchMap((numero) => {
          const contactoId = this.contactoId();
          if (contactoId == null) return of<ErpSelectOption[]>([]);
          return this.service.buscar(contactoId, this.cartera(), numero).pipe(
            map((docs) => docs.map(toReferenciaOption)),
            catchError(() => of<ErpSelectOption[]>([])),
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

  /** Cada enfoque lista las facturas más recientes, sin el filtro de la búsqueda anterior. */
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
