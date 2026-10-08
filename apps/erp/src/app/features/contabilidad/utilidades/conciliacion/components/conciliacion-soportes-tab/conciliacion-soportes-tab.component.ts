import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileDownloadService, I18nService, ToastService, type FilterCondition } from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  DataToolbarComponent,
  type PageChangeEvent,
  type ToolbarAction,
} from '@reddoc/feature-base';
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { importState } from '@erp/core/components/import-dialog/import-state';
import type { ExampleConfig } from '@erp/core/components/import-dialog/import-dialog.types';
import type { AppDict } from '@erp/i18n';
import { ConciliacionService, CONCILIACION_EXCEL_SERIALIZADOR } from '../../conciliacion.service';
import type { ConciliacionSoporte } from '../../conciliacion.model';
import {
  CONCILIACION_ESTADO_FILTER_FIELDS,
  CONCILIACION_SOPORTE_COLUMNS,
  CONCILIACION_TAB_PAGE_SIZE,
} from '../../conciliacion.constants';

/**
 * Pestaña del **extracto bancario**: las líneas que el banco entrega en Excel.
 *
 * No se teclean ni se editan: entran por importación ("Cargar soporte") y salen
 * todas juntas ("Limpiar"). El cruce contra el libro lo dispara la otra pestaña
 * y marca `estado_conciliado` también acá, por eso el padre puede forzar una
 * recarga con `reloadToken`.
 *
 * `canOperate` decide si se renderizan las acciones: el formulario de edición lo
 * prende, la ficha de solo lectura no.
 */
@Component({
  selector: 'app-conciliacion-soportes-tab',
  standalone: true,
  imports: [
    ConfirmDialogModule,
    DataTableComponent,
    DataToolbarComponent,
    DataFilterModalComponent,
    ImportDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './conciliacion-soportes-tab.component.html',
})
export class ConciliacionSoportesTabComponent {
  private readonly service = inject(ConciliacionService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly conciliacionId = input.required<number>();

  /** Muestra las acciones (importar, limpiar). La ficha las apaga. */
  readonly canOperate = input<boolean>(false);

  /** Cambiar el número fuerza una recarga (lo usa el padre tras conciliar). */
  readonly reloadToken = input<number>(0);

  protected readonly items = signal<readonly ConciliacionSoporte[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly activeFilters = signal<readonly FilterCondition[]>([]);
  protected readonly filtersVisible = signal(false);
  protected readonly isBusy = signal(false);

  // ── Importación ───────────────────────────────────────────────────────────
  /** Estado del diálogo del extracto: sube contra la conciliación abierta. */
  protected readonly importar = importState({
    upload: (file) => this.service.importarSoporte(this.conciliacionId(), file),
    onImported: () => this.loadPage(0),
  });

  /**
   * El ERP anterior servía la plantilla del extracto desde un XLSX alojado
   * fuera del backend, así que no hay endpoint que ofrecer. El botón se muestra
   * deshabilitado, con el motivo a la vista, hasta que el backend exponga uno.
   */
  protected readonly exampleConfig = computed<ExampleConfig>(() => ({
    mode: 'disabled',
    reason: this.t().entities.conciliacion.soporteTab.plantillaNoDisponible,
  }));

  protected readonly pageSize = CONCILIACION_TAB_PAGE_SIZE;
  protected readonly columns = CONCILIACION_SOPORTE_COLUMNS;
  protected readonly filterFields = CONCILIACION_ESTADO_FILTER_FIELDS;

  protected readonly hasItems = computed(() => this.totalCount() > 0);

  /** Acción destacada: cargar el extracto, que es por donde empieza la pestaña. */
  protected readonly primaryAction = computed<ToolbarAction | null>(() =>
    this.canOperate() && !this.isBusy()
      ? {
          id: 'cargar',
          labelKey: 'entities.conciliacion.soporteTab.cargar',
          iconClass: 'pi pi-upload',
        }
      : null,
  );

  /**
   * Resto de acciones, en el dropdown "Acciones". Se arman según el estado
   * —limpiar no aparece sin nada que limpiar— porque `ToolbarAction` no modela
   * el deshabilitado.
   */
  protected readonly trailingActions = computed<readonly ToolbarAction[]>(() => {
    const children: ToolbarAction[] = [];
    if (this.hasItems()) {
      children.push({
        id: 'export-excel',
        labelKey: 'common.actions.exportExcel',
        iconClass: 'pi pi-file-excel',
      });
    }
    if (this.canOperate() && this.hasItems() && !this.isBusy()) {
      children.push({
        id: 'limpiar',
        labelKey: 'entities.conciliacion.soporteTab.limpiar',
        iconClass: 'pi pi-trash',
      });
    }
    return children.length
      ? [{ id: 'actions', labelKey: 'common.actions.actions', iconClass: '', children }]
      : [];
  });

  constructor() {
    effect(() => {
      this.conciliacionId();
      this.reloadToken();
      this.loadPage(0);
    });
  }

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onPageChange(event: PageChangeEvent): void {
    this.loadPage(event.page);
  }

  protected openFilters(): void {
    this.filtersVisible.set(true);
  }

  protected clearFilters(): void {
    this.activeFilters.set([]);
    this.loadPage(0);
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'cargar':
        this.importar.open();
        break;
      case 'limpiar':
        this.onLimpiar();
        break;
      case 'export-excel':
        this.onExportExcel();
        break;
    }
  }

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  /** Borra todo el extracto cargado, previa confirmación destructiva. */
  private onLimpiar(): void {
    if (this.isBusy()) return;
    const labels = this.t().entities.conciliacion.soporteTab;
    this.confirmation.confirm({
      header: labels.confirmLimpiar.header,
      message: labels.confirmLimpiar.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.limpiar(),
    });
  }

  private onExportExcel(): void {
    this.fileDownload
      .download(this.service.exportSoporteUrl, {
        method: 'POST',
        body: {
          conciliacion_id: this.conciliacionId(),
          serializador: CONCILIACION_EXCEL_SERIALIZADOR,
        },
        fallbackFilename: 'conciliacion-soporte.xlsx',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private limpiar(): void {
    this.isBusy.set(true);
    const toasts = this.t().entities.conciliacion.soporteTab.toasts.limpiar;
    this.service
      .limpiarSoportes(this.conciliacionId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isBusy.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.loadPage(0);
        },
        error: () => this.toast.error(toasts.error.title, toasts.error.desc),
      });
  }

  loadPage(page: number): void {
    const id = this.conciliacionId();
    if (!id) return;
    this.currentPage.set(page);
    this.isLoading.set(true);
    this.service
      .listarSoportes(id, page + 1, this.pageSize, this.activeFilters())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.items.set(response.results);
          this.totalCount.set(response.count);
        },
        error: () => {
          this.items.set([]);
          this.totalCount.set(0);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}
