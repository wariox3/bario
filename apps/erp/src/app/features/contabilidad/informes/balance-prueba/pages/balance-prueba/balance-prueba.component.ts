import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import type { PaginatorState } from 'primeng/paginator';
import { FileDownloadService, I18nService, TenantService, ToastService } from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { BalancePruebaParamsComponent } from '../../components/balance-prueba-params/balance-prueba-params.component';
import { BalancePruebaTableComponent } from '../../components/balance-prueba-table/balance-prueba-table.component';
import { BalancePruebaService } from '../../balance-prueba.service';
import type { BalancePruebaRow, BalancePruebaTotales } from '../../balance-prueba.model';
import { buildBalancePruebaForm, buildBalancePruebaParams } from '../../balance-prueba.utils';

/** Filas por página. Mismo default que el resto de los listados del ERP. */
const PAGE_SIZE_DEFAULT = 25;

/**
 * Informe **Balance de prueba** del módulo Contabilidad.
 *
 * Saldos por cuenta de todo el plan en un periodo: saldo anterior, movimiento
 * del rango y saldo final. Es un **reporte que se genera**: la tabla arranca
 * vacía y el usuario elige los parámetros antes de consultar.
 *
 * A diferencia de sus ocho hermanos —que siguen con `InformeCuentasPageBase` y
 * el contrato `{ parametros }`— este informe ya usa
 * `/contabilidad/movimiento-informe/`, que **pagina**. Por eso no extiende la
 * base de la familia: los totales del pie ya no salen de sumar las filas
 * recibidas sino de la acción `totales/`, que cubre el informe completo.
 *
 * Exige que **ambas fechas caigan en el mismo año**: el saldo anterior se
 * calcula contra la apertura del ejercicio, así que un rango a caballo entre dos
 * años daría un balance que no cuadra.
 *
 * Sin PDF: la familia de endpoints nueva solo sirve `lista/`, `excel/` y
 * `totales/`.
 */
@Component({
  selector: 'app-balance-prueba',
  standalone: true,
  imports: [
    ListShellComponent,
    BalancePruebaParamsComponent,
    InformeCuentasActionsComponent,
    BalancePruebaTableComponent,
  ],
  templateUrl: './balance-prueba.component.html',
  styleUrl: './balance-prueba.component.scss',
})
export class BalancePruebaComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(BalancePruebaService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly fb = inject(FormBuilder);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly form = buildBalancePruebaForm(this.fb);

  protected readonly rows = signal<readonly BalancePruebaRow[]>([]);
  protected readonly totales = signal<BalancePruebaTotales | null>(null);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly isLoading = signal(false);
  protected readonly isExportingExcel = signal(false);
  /** `false` hasta la primera generación — distingue "sin generar" de "sin datos". */
  protected readonly generated = signal(false);
  /**
   * Los parámetros cambiaron después de generar: lo que se ve en la tabla ya no
   * corresponde al formulario. No se limpia la tabla —quitarle a alguien los
   * números que está leyendo es peor— pero sí se avisa, porque el Excel sí sale
   * con los parámetros nuevos y pantalla y archivo no coincidirían.
   */
  protected readonly paramsStale = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  protected get nombre(): string {
    return this.t().entities.balancePrueba.name;
  }

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.nombre },
    ];
  });

  protected readonly isBusy = computed(() => this.isLoading() || this.isExportingExcel());

  /** Texto del aviso de la botonera; vacío = no hay nada que avisar. */
  protected readonly hint = computed(() =>
    this.paramsStale() ? this.t().entities.informeCuentas.paramsStale : '',
  );

  /** La descarga solo tiene sentido sobre un informe ya generado. */
  protected readonly canExport = computed(() => this.generated() && !this.isBusy());

  constructor() {
    // Cualquier cambio de parámetro después de generar deja lo que se ve viejo.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.generated()) this.paramsStale.set(true);
    });
  }

  // ── Acciones ──────────────────────────────────────────────────────────────

  /**
   * Genera el informe desde la primera página. Pide filas y totales a la vez:
   * son dos endpoints con el mismo body y la tabla necesita los dos para
   * mostrar el cuadre.
   */
  protected generar(): void {
    if (this.form.invalid || this.isBusy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.page.set(0);
    this.consultar();
  }

  /**
   * Cambio de página o de tamaño. No revalida ni vuelve a pedir los totales
   * como acción aparte: `consultar()` los refresca con el mismo body, que no
   * cambió.
   */
  protected onPageChange(event: PaginatorState): void {
    if (!this.generated() || this.isBusy()) return;

    const page = event.page ?? 0;
    const pageSize = event.rows ?? this.pageSize();
    // PrimeNG reemite `onPageChange` cuando se le reprograma `first`/`rows`;
    // sin este guard cada respuesta dispararía otra consulta idéntica.
    if (page === this.page() && pageSize === this.pageSize()) return;

    this.page.set(page);
    this.pageSize.set(pageSize);
    this.consultar();
  }

  /** Excel del informe **completo**: mismo endpoint y mismo body que la consulta. */
  protected exportExcel(): void {
    if (!this.canExport()) return;
    this.isExportingExcel.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: this.service.buildBody(buildBalancePruebaParams(this.form)),
        fallbackFilename: 'balance-prueba.xlsx',
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

  private consultar(): void {
    const params = buildBalancePruebaParams(this.form);

    this.isLoading.set(true);
    forkJoin({
      pagina: this.service.list(params, this.page(), this.pageSize()),
      totales: this.service.totales(params),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ pagina, totales }) => {
          this.rows.set(pagina.results);
          this.totalCount.set(pagina.count);
          this.totales.set(totales);
          this.generated.set(true);
          this.paramsStale.set(false);
        },
        error: () => {
          this.rows.set([]);
          this.totalCount.set(0);
          this.totales.set(null);
          // Se marca igual como generado: la tabla debe decir "sin resultados",
          // no "todavía no generaste" — el toast ya informa del fallo.
          this.generated.set(true);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }
}
