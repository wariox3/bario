import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, type Subscription } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import {
  buildFiltros,
  FileDownloadService,
  I18nService,
  LIST_PAGE_SIZE,
  TenantService,
  ToastService,
} from '@reddoc/core';
import {
  DataTableComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import type {
  InconsistenciaGuardada,
  PeriodoOpcion,
} from '@erp/features/contabilidad/masters/periodo/periodo.model';
import { PeriodoService } from '@erp/features/contabilidad/masters/periodo/periodo.service';
import { ACCION_RESOLVER, COLUMNS, ROW_ACTIONS } from '../../inconsistencias.constants';
import { INCONSISTENCIA_ENDPOINT, InconsistenciasService } from '../../inconsistencias.service';

/** Fase de la consola: qué muestra el cuerpo bajo la botonera. */
type Estado = 'inicial' | 'analizando' | 'listo' | 'error';

/**
 * Utilidad **Inconsistencias** de Contabilidad: corre sobre un periodo abierto
 * el mismo análisis que se hace al bloquearlo, sin bloquearlo
 * (`POST periodo/<id>/analizar/`), y lista lo que encontró.
 *
 * Solo ofrece periodos con `estado_bloqueado = false`: uno bloqueado ya pasó el
 * análisis. Analizar no es solo una consulta —reemplaza las inconsistencias
 * guardadas del periodo—, por eso corre con el botón y no al elegir.
 *
 * La respuesta viene paginada de a 25 y el backend no expone otra forma de
 * pedir las páginas siguientes que el mismo `analizar/?page=`: cambiar de
 * página vuelve a analizar.
 *
 * El Excel lo arma el backend (`inconsistencia/excel/`) con lo guardado del
 * periodo: se habilita tras analizar, cuando lo guardado es lo que se ve.
 *
 * Las filas que el backend sabe corregir solo (`resolver_automatico`) traen el
 * botón Resolver. Tras resolver se vuelve a analizar la página: así se ve la
 * lista real y el periodo actualiza su `estado_inconsistencia`, que resolver
 * no toca.
 */
@Component({
  selector: 'app-inconsistencias',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    DataTableComponent,
    FormsModule,
    ListShellComponent,
    SelectModule,
  ],
  templateUrl: './inconsistencias.component.html',
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InconsistenciasComponent {
  private readonly service = inject(PeriodoService);
  private readonly inconsistencias = inject(InconsistenciasService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly columns = COLUMNS;
  protected readonly rowActions = ROW_ACTIONS;

  private readonly periodos = signal<readonly PeriodoOpcion[]>([]);
  protected readonly cargandoPeriodos = signal(true);

  protected readonly periodoId = signal<number | null>(null);
  protected readonly estado = signal<Estado>('inicial');
  /** Cambio de página o resolución con resultados ya pintados: la tabla muestra su carga. */
  protected readonly paginando = signal(false);
  protected readonly items = signal<readonly InconsistenciaGuardada[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly currentPage = signal(0);
  protected readonly exportandoExcel = signal(false);
  /** Nombre del periodo analizado: el selector puede cambiar antes de que llegue la respuesta. */
  protected readonly periodoAnalizado = signal('');

  private analisis: Subscription | null = null;

  /** Del más reciente al más viejo: lo que se suele analizar es el mes en curso. */
  protected readonly opciones = computed(() => {
    const meses = this.t().entities.periodo.meses;
    return [...this.periodos()]
      .sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      .map((p) => ({ id: p.id, nombre: `${meses[p.mes - 1] ?? p.mes} ${p.anio}` }));
  });

  protected readonly resumen = computed(() => {
    const dict = this.t().entities.inconsistencias.encontradas;
    const n = this.totalCount();
    return (n === 1 ? dict.one : dict.other.replace('{n}', String(n))).replace(
      '{periodo}',
      this.periodoAnalizado(),
    );
  });

  protected readonly sinInconsistencias = computed(() =>
    this.t().entities.inconsistencias.sinInconsistencias.desc.replace(
      '{periodo}',
      this.periodoAnalizado(),
    ),
  );

  /** Migas: Contabilidad (navegable) → esta utilidad. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      { label: this.t().entities.inconsistencias.name },
    ];
  });

  constructor() {
    this.service
      .abiertos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (periodos) => {
          this.periodos.set(periodos);
          this.cargandoPeriodos.set(false);
        },
        error: () => this.cargandoPeriodos.set(false),
      });
    this.destroyRef.onDestroy(() => this.analisis?.unsubscribe());
  }

  /** Otro periodo: lo pintado ya no le corresponde. */
  protected onPeriodo(id: number | null): void {
    this.analisis?.unsubscribe();
    this.periodoId.set(id);
    this.items.set([]);
    this.totalCount.set(0);
    this.estado.set('inicial');
    this.paginando.set(false);
  }

  protected onAnalizar(): void {
    const id = this.periodoId();
    if (id === null || this.estado() === 'analizando') return;
    this.periodoAnalizado.set(this.opciones().find((o) => o.id === id)?.nombre ?? '');
    this.currentPage.set(0);
    this.estado.set('analizando');
    this.cargar(id);
  }

  protected onPageChange(event: PageChangeEvent): void {
    const id = this.periodoId();
    if (id === null) return;
    this.currentPage.set(event.page);
    this.paginando.set(true);
    this.cargar(id);
  }

  /** Hay algo que exportar: un análisis con resultados y sin otra petición en curso. */
  protected readonly puedeExportar = computed(
    () => this.estado() === 'listo' && this.totalCount() > 0 && !this.paginando(),
  );

  protected onExportarExcel(): void {
    const id = this.periodoId();
    if (id === null || this.exportandoExcel()) return;
    this.exportandoExcel.set(true);
    this.fileDownload
      .download(`${INCONSISTENCIA_ENDPOINT}excel/`, {
        method: 'POST',
        body: {
          filtros: buildFiltros([{ field: 'periodo_id', operator: 'eq', value: id }]),
          ordenamientos: [],
        },
        fallbackFilename: 'inconsistencias.xlsx',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exportandoExcel.set(false)),
      )
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== ACCION_RESOLVER || this.paginando()) return;
    const fila = event.row as InconsistenciaGuardada;
    const dict = this.t().entities.inconsistencias.resolver;
    this.confirmation.confirm({
      header: dict.confirm.header,
      icon: 'pi pi-info-circle',
      message: dict.confirm.message
        .replace('{tipo}', fila.inconsistencia_tipo_nombre)
        .replace('{descripcion}', fila.descripcion),
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-wrench',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.resolver(fila),
    });
  }

  private resolver(fila: InconsistenciaGuardada): void {
    const id = this.periodoId();
    if (id === null) return;
    const dict = this.t().entities.inconsistencias.resolver;
    this.paginando.set(true);
    // El error lo avisa el interceptor con el mensaje del backend.
    this.analisis = this.inconsistencias.resolver(fila.id).subscribe({
      next: () => {
        this.toast.success(dict.toast.title, dict.toast.desc);
        // Si era la única de la última página, esa página ya no existe.
        const quedan = this.totalCount() - 1;
        const ultima = Math.max(Math.ceil(quedan / LIST_PAGE_SIZE) - 1, 0);
        this.currentPage.set(Math.min(this.currentPage(), ultima));
        this.cargar(id);
      },
      error: () => this.paginando.set(false),
    });
  }

  private cargar(id: number): void {
    this.analisis?.unsubscribe();
    this.analisis = this.service.analizar(id, this.currentPage() + 1).subscribe({
      next: (res) => {
        this.items.set(res.results);
        this.totalCount.set(res.count);
        this.estado.set('listo');
        this.paginando.set(false);
      },
      error: () => {
        this.items.set([]);
        this.totalCount.set(0);
        this.estado.set('error');
        this.paginando.set(false);
      },
    });
  }
}
