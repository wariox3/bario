import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileDownloadService, I18nService, ToastService, type FilterCondition } from '@reddoc/core';
import {
  DataFilterModalComponent,
  DataTableComponent,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import { ImportDialogComponent } from '@erp/core/components/import-dialog/import-dialog.component';
import { parseImportErrors } from '@erp/core/components/import-dialog/import-dialog.utils';
import type {
  ExampleConfig,
  ImportError,
} from '@erp/core/components/import-dialog/import-dialog.types';
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
    ButtonModule,
    ConfirmDialogModule,
    DataTableComponent,
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
  protected readonly importVisible = signal(false);
  protected readonly importLoading = signal(false);
  protected readonly importErrors = signal<readonly ImportError[]>([]);
  protected readonly importErrorSummary = signal('');
  protected readonly importErrorTotal = signal(0);

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

  protected onFiltersApply(filters: readonly FilterCondition[]): void {
    this.activeFilters.set(filters);
    this.loadPage(0);
  }

  protected onImportOpen(): void {
    this.clearImportErrors();
    this.importVisible.set(true);
  }

  protected onImportVisibleChange(value: boolean): void {
    this.importVisible.set(value);
  }

  protected onImportRequested(file: File): void {
    if (this.importLoading()) return;
    this.importLoading.set(true);
    this.clearImportErrors();
    this.service
      .importarSoporte(this.conciliacionId(), file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importLoading.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (this.applyImportErrors(parseImportErrors(result))) return;
          const toasts = this.t().common.import.toasts;
          this.toast.success(toasts.success.title, toasts.success.desc);
          this.importVisible.set(false);
          this.clearImportErrors();
          this.loadPage(0);
        },
        error: (err: HttpErrorResponse) => {
          if (!this.applyImportErrors(parseImportErrors(err.error))) {
            const toasts = this.t().common.import.toasts;
            this.toast.error(toasts.error.title, toasts.error.desc);
          }
        },
      });
  }

  /** Borra todo el extracto cargado, previa confirmación destructiva. */
  protected onLimpiar(): void {
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

  protected onExportExcel(): void {
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

  private applyImportErrors(parsed: ReturnType<typeof parseImportErrors>): boolean {
    if (parsed.errors.length === 0 && !parsed.summary) return false;
    this.importErrors.set(parsed.errors);
    this.importErrorSummary.set(parsed.summary);
    this.importErrorTotal.set(parsed.total);
    return true;
  }

  private clearImportErrors(): void {
    this.importErrors.set([]);
    this.importErrorSummary.set('');
    this.importErrorTotal.set(0);
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
