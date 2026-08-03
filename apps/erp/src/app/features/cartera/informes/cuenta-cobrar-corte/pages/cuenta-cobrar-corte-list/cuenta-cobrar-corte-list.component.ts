import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { finalize } from 'rxjs';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  startOfToday,
  toIsoDate,
  type ListQuery,
  type SortSpec,
} from '@reddoc/core';
import {
  DataTableComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { CuentaCobrarCorteService } from '../../cuenta-cobrar-corte.service';
import type { CuentaCobrarCorte } from '../../cuenta-cobrar-corte.model';
import { CUENTA_COBRAR_CORTE_COLUMNS } from '../../cuenta-cobrar-corte.constants';

/**
 * Informe **Cuentas por cobrar corte** (Cartera).
 *
 * Cartera por cobrar **a una fecha de corte** ("fecha hasta"): una foto puntual,
 * no el saldo vivo. Se distingue del informe `cuenta-cobrar` en que la fecha es
 * el **parámetro protagonista** del reporte, no un filtro opcional: por eso el
 * toolbar estándar de filtros se reemplaza por un toolbar de reporte
 * (datepicker + Generar + Exportar) y la tabla arranca **vacía hasta Generar**.
 *
 * `appliedDate` (la fecha realmente consultada) queda `null` hasta la primera
 * generación; a partir de ahí, paginar/ordenar recarga con esa misma fecha.
 */
@Component({
  selector: 'app-cuenta-cobrar-corte-list',
  standalone: true,
  imports: [FormsModule, ButtonModule, DatePickerModule, ListShellComponent, DataTableComponent],
  templateUrl: './cuenta-cobrar-corte-list.component.html',
  styleUrl: './cuenta-cobrar-corte-list.component.scss',
})
export class CuentaCobrarCorteListComponent {
  private readonly service = inject(CuentaCobrarCorteService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  /** Valor del datepicker (default hoy); aún no consultado. */
  protected readonly fecha = signal<Date>(startOfToday());
  /** Fecha de corte realmente consultada. `null` hasta la primera generación. */
  protected readonly appliedDate = signal<string | null>(null);

  protected readonly items = signal<readonly CuentaCobrarCorte[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly isExportingExcel = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(25);
  protected readonly sort = signal<readonly SortSpec[]>([]);

  protected readonly generated = computed(() => this.appliedDate() !== null);
  protected readonly canExport = computed(
    () => this.generated() && !this.isLoading() && !this.isExportingExcel(),
  );

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.cuentaCobrarCorte.name },
    ];
  });

  protected readonly columns = CUENTA_COBRAR_CORTE_COLUMNS;

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Aplica la fecha del datepicker y trae la primera página del corte. */
  protected generar(): void {
    const iso = toIsoDate(this.fecha());
    if (!iso) return;
    this.appliedDate.set(iso);
    this.currentPage.set(0);
    this.loadList();
  }

  protected onPageChange(event: PageChangeEvent): void {
    if (!this.generated()) return;
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadList();
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    if (!this.generated()) return;
    this.sort.set(sort);
    this.currentPage.set(0);
    this.loadList();
  }

  protected exportExcel(): void {
    const fecha = this.appliedDate();
    if (!fecha || this.isExportingExcel()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'GET',
        params: { fecha, excel: 'True' },
        fallbackFilename: 'cuentas-por-cobrar-corte.xlsx',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isExportingExcel.set(false)),
      )
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private loadList(): void {
    const fecha = this.appliedDate();
    if (!fecha) return;

    const query: ListQuery = {
      filters: [],
      sort: this.sort(),
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    this.isLoading.set(true);
    this.service
      .list(fecha, query)
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
