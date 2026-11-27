import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService, ToastService, type ColumnDef } from '@reddoc/core';
import {
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import type { ExogenaFormato } from '../../exogena.model';
import { ExogenaService } from '../../exogena.service';

/** Columnas de los formatos: los importes en pesos, la fecha corta. */
const FORMATO_COLUMNS: readonly ColumnDef[] = [
  { field: 'formato_nombre', headerKey: 'entities.exogena.formatos.columns.formato', type: 'text' },
  {
    field: 'cuantia_menor',
    headerKey: 'entities.exogena.formatos.columns.cuantiaMenor',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'registros',
    headerKey: 'entities.exogena.formatos.columns.registros',
    type: 'number',
    width: '110px',
    align: 'right',
  },
  {
    field: 'total',
    headerKey: 'entities.exogena.formatos.columns.total',
    type: 'currency',
    align: 'right',
  },
  {
    field: 'fecha_generacion',
    headerKey: 'entities.exogena.formatos.columns.fechaGeneracion',
    type: 'date',
    width: '150px',
  },
  {
    field: 'estado_presentado',
    headerKey: 'entities.exogena.formatos.columns.presentado',
    type: 'boolean',
    width: '120px',
    align: 'center',
  },
];

/**
 * Formatos de la exógena de un año, dentro de su ficha. Se carga sola y pagina de
 * a 25. Sigue la botonera de tabla: «Cargar formatos» (suma los del catálogo que
 * falten) es la principal y, con la exógena presentada, se ve deshabilitada —el
 * backend respondería 400—.
 */
@Component({
  selector: 'app-exogena-formatos',
  standalone: true,
  imports: [DataTableComponent, DataToolbarComponent],
  templateUrl: './exogena-formatos.component.html',
})
export class ExogenaFormatosComponent implements OnInit {
  private readonly service = inject(ExogenaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly exogenaId = input.required<number>();
  /** Presentada ya no se modifica: «Cargar formatos» queda deshabilitado. */
  readonly presentada = input(false);

  protected readonly columns = FORMATO_COLUMNS;
  protected readonly page = signal(0);
  protected readonly totalFormatos = signal(0);
  protected readonly formatos = signal<readonly ExogenaFormato[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isCargando = signal(false);

  protected readonly primaryAction = computed<ToolbarAction>(() => ({
    id: 'cargar',
    labelKey: 'entities.exogena.formatos.cargar',
    iconClass: 'pi pi-download',
    disabled: this.presentada() || this.isCargando(),
    loading: this.isCargando(),
  }));

  ngOnInit(): void {
    this.load();
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.page.set(event.page);
    this.load();
  }

  protected onToolbarAction(actionId: string): void {
    if (actionId === 'cargar') this.cargarFormatos();
  }

  private cargarFormatos(): void {
    if (this.isCargando()) return;
    this.isCargando.set(true);
    this.service
      .cargarFormatos(this.exogenaId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isCargando.set(false)),
      )
      .subscribe({
        // El error ya lo avisa el interceptor.
        next: ({ creados }) => {
          this.avisarCarga(creados);
          this.page.set(0);
          this.load();
        },
      });
  }

  private avisarCarga(creados: number): void {
    const toasts = this.t().entities.exogena.formatos.toasts;
    if (creados === 0) {
      this.toast.success(toasts.sinNuevos.title, toasts.sinNuevos.desc);
      return;
    }
    const desc = creados === 1 ? toasts.cargados.one : toasts.cargados.other;
    this.toast.success(toasts.cargados.title, desc.replace('{n}', String(creados)));
  }

  private load(): void {
    this.isLoading.set(true);
    this.service
      .listarFormatos(this.exogenaId(), this.page())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.formatos.set(res.results);
          this.totalFormatos.set(res.count);
        },
        error: () => {
          this.formatos.set([]);
          this.totalFormatos.set(0);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().entities.exogena.formatos.loadError,
          );
        },
      });
  }
}
