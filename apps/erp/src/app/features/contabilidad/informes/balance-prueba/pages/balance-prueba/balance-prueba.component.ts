import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { finalize } from 'rxjs';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  formatCop,
  toIsoDate,
  type ErpSelectOption,
} from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import { BalancePruebaService } from '../../balance-prueba.service';
import type { BalancePruebaParams, BalancePruebaRow } from '../../balance-prueba.model';
import { rangoFechasMismoAnio } from '../../balance-prueba.validators';

/** Primer día del mes en curso — valor inicial de `fecha_desde`. */
function inicioDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/** Último día del mes en curso — valor inicial de `fecha_hasta`. */
function finDelMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/**
 * Extrae el código de cuenta de la etiqueta del selector.
 *
 * `<app-cuenta-select>` entrega `{ id, nombre }` donde `nombre` es la etiqueta
 * `"1105 - Caja general"`. El backend quiere el código aparte del id, así que se
 * recorta el primer segmento.
 *
 * TODO(backend/ui): si el backend acota el rango solo por id, este campo sobra;
 * si lo necesita, conviene que el selector exponga la fila cruda en vez de
 * reconstruir el código desde la etiqueta.
 */
function codigoDe(option: ErpSelectOption | null): string {
  if (!option?.nombre) return '';
  return option.nombre.split(' - ')[0]?.trim() ?? '';
}

/**
 * Informe **Balance de prueba** del módulo Contabilidad.
 *
 * Primer informe contable del ERP y molde de los que siguen (auxiliares, estado
 * de resultados, situación financiera): en vez de una lista que se carga sola y
 * se va filtrando, es un **reporte que se genera**. El usuario fija los
 * parámetros —periodo, rango de cuentas y dos banderas— y pulsa *Generar*; la
 * tabla arranca vacía y el backend devuelve el balance completo, sin paginar,
 * porque los totales tienen que cuadrar contra lo que se ve.
 *
 * Las tres acciones (*Generar*, *Excel*, *PDF*) pegan al mismo endpoint con los
 * mismos parámetros; solo cambia una bandera en el body.
 */
@Component({
  selector: 'app-balance-prueba',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    ListShellComponent,
    ErpCuentaSelectComponent,
  ],
  templateUrl: './balance-prueba.component.html',
  styleUrl: './balance-prueba.component.scss',
})
export class BalancePruebaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BalancePruebaService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Parámetros ────────────────────────────────────────────────────────────

  /**
   * Arranca en el mes en curso, como el informe original. El rango de cuentas
   * vacío significa "todo el plan".
   */
  protected readonly form = this.fb.nonNullable.group(
    {
      fecha_desde: [inicioDelMes(), Validators.required],
      fecha_hasta: [finDelMes(), Validators.required],
      incluir_cierre: [false],
      cuenta_con_movimiento: [false],
      cuenta_desde: [null as ErpSelectOption | null],
      cuenta_hasta: [null as ErpSelectOption | null],
    },
    { validators: rangoFechasMismoAnio('fecha_desde', 'fecha_hasta') },
  );

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly rows = signal<readonly BalancePruebaRow[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isExportingExcel = signal(false);
  protected readonly isExportingPdf = signal(false);
  /** `false` hasta la primera generación — distingue "sin generar" de "sin datos". */
  protected readonly generated = signal(false);

  // ── Derivados ─────────────────────────────────────────────────────────────

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.balancePrueba.name },
    ];
  });

  /**
   * Totales de la columna de movimiento. En un balance cuadrado débito y crédito
   * coinciden, así que la fila de totales es el chequeo visual del informe.
   * Los saldos no se suman: mezclan naturalezas y su total no significa nada.
   */
  protected readonly totalDebito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.debito ?? 0), 0),
  );
  protected readonly totalCredito = computed(() =>
    this.rows().reduce((acc, row) => acc + (row.credito ?? 0), 0),
  );

  protected readonly isBusy = computed(
    () => this.isLoading() || this.isExportingExcel() || this.isExportingPdf(),
  );

  /** Las descargas solo tienen sentido sobre un reporte ya generado. */
  protected readonly canExport = computed(() => this.generated() && !this.isBusy());

  // ── Handlers ──────────────────────────────────────────────────────────────

  protected generar(): void {
    if (this.form.invalid || this.isBusy()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.service
      .consultar(this.buildParams())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (registros) => {
          this.rows.set(registros);
          this.generated.set(true);
        },
        error: () => {
          this.rows.set([]);
          this.generated.set(true);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }

  protected exportExcel(): void {
    this.descargar('excel', this.isExportingExcel, 'balance-prueba.xlsx');
  }

  protected exportPdf(): void {
    this.descargar('pdf', this.isExportingPdf, 'balance-prueba.pdf');
  }

  protected formatMonto(value: number | null): string {
    return formatCop(value ?? 0);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Descarga el reporte en el formato pedido. Mismo endpoint y mismos
   * parámetros que `generar()`; solo cambia la bandera del body.
   */
  private descargar(
    formato: 'excel' | 'pdf',
    flag: WritableSignal<boolean>,
    fallbackFilename: string,
  ): void {
    if (!this.canExport()) return;
    flag.set(true);
    this.fileDownload
      .download(this.service.exportUrl, {
        method: 'POST',
        body: { parametros: this.buildParams(), [formato]: true },
        fallbackFilename,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => flag.set(false)),
      )
      .subscribe({
        error: () =>
          this.toast.error(
            this.t().common.toasts.exportError.title,
            this.t().common.toasts.exportError.desc,
          ),
      });
  }

  /** Traduce el formulario al contrato del backend (fechas ISO, cuentas id + código). */
  private buildParams(): BalancePruebaParams {
    const value = this.form.getRawValue();
    return {
      fecha_desde: toIsoDate(value.fecha_desde) ?? '',
      fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
      incluir_cierre: value.incluir_cierre,
      cuenta_con_movimiento: value.cuenta_con_movimiento,
      cuenta_desde: value.cuenta_desde?.id ?? null,
      cuenta_hasta: value.cuenta_hasta?.id ?? null,
      cuenta_codigo_desde: codigoDe(value.cuenta_desde),
      cuenta_codigo_hasta: codigoDe(value.cuenta_hasta),
    };
  }
}
