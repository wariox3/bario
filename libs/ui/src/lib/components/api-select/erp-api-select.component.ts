import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { FilterService } from 'primeng/api';
import { Select, SelectModule } from 'primeng/select';
import { ErpSelectDataService, ErpSelectOption } from '@reddoc/core';

/**
 * Regla de filtro propia (registrada en el `FilterService` de PrimeNG): los
 * campos numéricos —el `id`— casan por **prefijo** y el resto por «contiene».
 * PrimeNG solo tipa sus reglas nativas, de ahí la conversión.
 */
const ID_PREFIX_MATCH_MODE = 'idPrefixOrContains' as unknown as Select['filterMatchMode'];

function idPrefixOrContains(value: unknown, filter: unknown, locale?: string): boolean {
  if (filter === undefined || filter === null || String(filter).trim() === '') return true;
  if (value === undefined || value === null) return false;
  const query = String(filter).toLocaleLowerCase(locale);
  if (typeof value === 'number') return String(value).startsWith(query);
  return String(value).toLocaleLowerCase(locale).includes(query);
}

@Component({
  selector: 'lib-api-select',
  standalone: true,
  imports: [SelectModule, FormsModule],
  template: `
    <p-select
      [inputId]="inputId()"
      [ariaLabel]="ariaLabel()"
      [options]="options()"
      [ngModel]="value()"
      (ngModelChange)="onValueChange($event)"
      (onBlur)="onTouchedFn()"
      [placeholder]="placeholder()"
      [disabled]="disabled() || loading()"
      [invalid]="invalid()"
      [loading]="loading()"
      [showClear]="showClear()"
      [filter]="showFilter()"
      [filterBy]="idPrefixSearch() ? 'id,nombre' : filterBy()"
      [filterMatchMode]="idPrefixSearch() ? idPrefixMatchMode : 'contains'"
      [filterPlaceholder]="filterPlaceholder()"
      [resetFilterOnHide]="true"
      optionLabel="nombre"
      dataKey="id"
      appendTo="body"
      [fluid]="true"
      [size]="size()"
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
  private readonly filterService = inject(FilterService);
  protected readonly idPrefixMatchMode = ID_PREFIX_MATCH_MODE;

  /** Endpoint `seleccionar` del que se trae el catálogo. Sobra si viene `catalogo`. */
  readonly endpoint = input<string>('');
  readonly params = input<Record<string, string>>({});
  /**
   * Catálogo ya cargado por el padre. Si viene, el select **no consulta**: es
   * para las celdas de una tabla de líneas, donde un fetch por fila multiplica
   * la misma petición por cada línea del documento (y otra vez al guardar,
   * cuando la fila se reconstruye). El padre lo carga una vez con
   * `catalogoCompartido` y lo reparte. `null` (default) = el select trae el suyo.
   *
   * Mientras el padre lo carga llega vacío; el valor actual se pinta igual
   * (ver el `effect`), así que la celda no se ve en blanco ni se deshabilita.
   */
  readonly catalogo = input<readonly ErpSelectOption[] | null>(null);
  readonly inputId = input<string>('');
  /**
   * Nombre accesible del select, para cuando no hay un `<label for>` que lo
   * nombre: lo típico es un control dentro de un campo compuesto, donde el
   * rótulo visible nombra al conjunto (tipo · número · DV) y no a cada parte.
   */
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly placeholder = input<string>('Selecciona…');
  readonly invalid = input<boolean>(false);
  /**
   * Tamaño del select, como el `size` de PrimeNG. Sin él, el normal. Se usa para
   * que case con los `pSize="small"` vecinos: en una fila flex el más alto estira
   * al resto, así que un select normal agranda también el input de al lado.
   */
  readonly size = input<'small' | 'large' | undefined>(undefined);
  /**
   * Muestra la equis para vaciar el campo. Default `false`: en un campo
   * obligatorio la equis ofrece un estado que el formulario va a rechazar, y en
   * uno con `suggestedIndex` invita a borrar lo que el sistema acaba de sugerir.
   * Se enciende donde **no elegir** es una respuesta válida y distinta de no
   * haber contestado todavía (p. ej. un tipo de documento sin resolución).
   */
  readonly showClear = input<boolean>(false);
  /** Posición (0-based) a auto-seleccionar cuando cargan las opciones y el control está vacío. `null` lo desactiva. */
  readonly suggestedIndex = input<number | null>(null);
  /**
   * Opción a auto-seleccionar por **contenido**, cuando la posición no sirve
   * porque el backend no garantiza el orden (p. ej. el método de pago con
   * `codigo === '1'`). Gana sobre `suggestedIndex`; si ninguna cumple, no
   * sugiere nada. Mismas reglas: solo con el control vacío.
   */
  readonly suggestedMatch = input<((option: ErpSelectOption) => boolean) | null>(null);
  /**
   * Formatea la etiqueta de la opción (seleccionada y en el desplegable). Por
   * default se muestra `nombre`; pásalo para componer otros campos, p. ej.
   * `(o) => \`${o.id} - ${o.nombre}\``. La opción puede tipar campos extra del
   * endpoint vía el genérico `T`.
   */
  readonly displayWith = input<((option: ErpSelectOption) => string) | null>(null);
  /**
   * A partir de cuántas opciones el desplegable muestra su buscador. Un catálogo
   * corto (dos o tres opciones) se lee de un vistazo y el input solo estorba;
   * uno largo se vuelve inmanejable sin él. `null` lo desactiva siempre.
   */
  readonly filterThreshold = input<number | null>(10);
  /**
   * Campos por los que filtra el buscador, separados por coma. El default alcanza
   * salvo que `displayWith` componga la etiqueta con otros campos del endpoint: ahí
   * hay que nombrarlos (p. ej. `'nombre,codigo'`) o el usuario teclearía lo que ve
   * sin obtener resultados.
   */
  readonly filterBy = input<string>('nombre');
  readonly filterPlaceholder = input<string>('Buscar…');
  /**
   * Para catálogos cuyo id es un código jerárquico (el PUC: clase 5, grupo 51,
   * cuenta 5105): el buscador casa el id **por prefijo** —`51` trae 51xx y no
   * 1512 ni 2510— y el nombre por «contiene», y las opciones se ordenan por id.
   * Ignora `filterBy`.
   */
  readonly idPrefixSearch = input<boolean>(false);

  /**
   * Emite el catálogo cada vez que llega del endpoint. Sirve a quien necesita
   * campos extra de las filas sin una segunda petición: completar un valor
   * cargado por id en edición —que llega como `{ id, nombre }`— o elegir un
   * default por id en vez de por posición.
   */
  readonly optionsLoaded = output<readonly ErpSelectOption[]>();

  readonly value = signal<ErpSelectOption | null>(null);
  readonly disabled = signal(false);
  readonly options = signal<ErpSelectOption[]>([]);
  readonly loading = signal(false);

  /** El buscador filtra en cliente sobre el catálogo ya cargado; no consulta de nuevo. */
  readonly showFilter = computed(() => {
    const threshold = this.filterThreshold();
    return threshold !== null && this.options().length >= threshold;
  });

  private onChangeFn: (value: ErpSelectOption | null) => void = () => undefined;
  onTouchedFn: () => void = () => undefined;

  /** Último `catalogo` del padre ya sugerido y emitido, para no repetirlo en cada selección. */
  private catalogoAplicado: readonly ErpSelectOption[] | null = null;

  constructor() {
    this.filterService.register(ID_PREFIX_MATCH_MODE, idPrefixOrContains);

    effect((onCleanup) => {
      // Catálogo del padre: no hay nada que consultar. El valor se lee
      // trackeado porque puede no estar en el catálogo —una línea cargada en
      // edición antes de que el padre lo reciba, o un almacén ya inactivo—: se
      // antepone para que el p-select tenga con qué pintarlo. Sin red de por
      // medio, re-correr en cada selección no cuesta nada.
      const catalogo = this.catalogo();
      if (catalogo !== null) {
        this.aplicarCatalogo(catalogo, this.value());
        return;
      }

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
      if (!endpoint) {
        this.options.set([]);
        return;
      }
      this.loading.set(true);
      const fetch = this.dataService.fetchAllOptions(endpoint, params).subscribe({
        next: (fetched) => {
          const options = this.ordenar(fetched);
          this.options.set(options);
          this.loading.set(false);
          this.applySuggestion(options);
          this.optionsLoaded.emit(options);
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
   * El backend no garantiza el orden (descarta `ordering`): con códigos
   * jerárquicos se ordena aquí para que el filtrado salga en secuencia.
   */
  private ordenar(options: readonly ErpSelectOption[]): ErpSelectOption[] {
    return untracked(this.idPrefixSearch) ? [...options].sort((a, b) => a.id - b.id) : [...options];
  }

  /**
   * Pinta el catálogo que mandó el padre, con el valor actual antepuesto si no
   * está en él. La sugerencia y `optionsLoaded` corren una vez por catálogo
   * recibido —no en cada selección— y no con el vacío de mientras carga.
   */
  private aplicarCatalogo(
    catalogo: readonly ErpSelectOption[],
    current: ErpSelectOption | null,
  ): void {
    const options = this.ordenar(catalogo);
    const faltaActual = current !== null && !options.some((o) => o.id === current.id);
    this.options.set(faltaActual ? [current, ...options] : options);
    this.loading.set(false);
    if (catalogo.length === 0 || catalogo === this.catalogoAplicado) return;
    this.catalogoAplicado = catalogo;
    untracked(() => {
      this.applySuggestion(options);
      this.optionsLoaded.emit(options);
    });
  }

  /**
   * Sugiere una opción por defecto —por contenido (`suggestedMatch`) o por
   * posición (`suggestedIndex`)— cuando el control está vacío. No pisa una
   * selección existente ni un valor cargado en edición. Sin coincidencia, o con
   * el índice nulo o fuera de rango, no hace nada.
   */
  private applySuggestion(options: ErpSelectOption[]): void {
    if (this.value() !== null) return;
    const match = this.suggestedMatch();
    const index = this.suggestedIndex();
    const option = match ? options.find(match) : index !== null ? options[index] : undefined;
    if (option) this.onValueChange(option);
  }
}
