import { DestroyRef, computed, inject, signal, type WritableSignal } from '@angular/core';
import { FormBuilder, type ValidatorFn } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FileDownloadService, I18nService, TenantService, ToastService } from '@reddoc/core';
import type { BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import type { InformeCuentasService } from './informe-cuentas.service';
import type { InformeCuentasParams } from './informe-cuentas.types';
import { buildInformeCuentasForm, buildInformeCuentasParams } from './informe-cuentas.utils';
import { rangoFechas } from './informe-cuentas.validators';

/**
 * Base de las páginas de informes contables de saldos por cuenta.
 *
 * Todas hacen lo mismo —armar los parámetros, generar, descargar en Excel y en
 * PDF— y solo cambian el endpoint, el nombre visible y el nombre del archivo.
 * Concentrar eso acá deja cada informe en poco más que su declaración.
 *
 * Lo que aporta:
 *  - El formulario de parámetros (`form`) con su validador de rango.
 *  - `generar()`, `exportExcel()`, `exportPdf()` y los flags de progreso.
 *  - `generated`, que distingue "todavía no generaste" de "no hay resultados".
 *  - Las migas, derivadas del módulo activo.
 *
 * Lo que cada informe declara: `service`, `nombre`, `archivo` y —si necesita
 * otra regla de fechas o parámetros extra— `rangeValidator()` y `buildParams()`.
 */
export abstract class InformeCuentasPageBase<
  TRow,
  TParams extends InformeCuentasParams = InformeCuentasParams,
> {
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly fb = inject(FormBuilder);

  protected readonly t = this.i18n.t;

  // ── A declarar por cada informe ───────────────────────────────────────────

  /** Servicio del informe (declara su endpoint). */
  protected abstract readonly service: InformeCuentasService<TRow, TParams>;

  /** Nombre visible: título de la página y última miga. */
  protected abstract get nombre(): string;

  /** Nombre base de las descargas, sin extensión (p. ej. `'balance-prueba'`). */
  protected abstract readonly archivo: string;

  /**
   * Regla de validación del rango de fechas. Por defecto solo exige que
   * `desde <= hasta`; el balance de prueba la endurece al mismo año.
   */
  protected rangeValidator(): ValidatorFn {
    return rangoFechas('fecha_desde', 'fecha_hasta');
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  protected readonly form = buildInformeCuentasForm(this.fb, this.rangeValidator());

  protected readonly rows = signal<readonly TRow[]>([]);
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
      { label: this.nombre },
    ];
  });

  protected readonly isBusy = computed(
    () => this.isLoading() || this.isExportingExcel() || this.isExportingPdf(),
  );

  /** Las descargas solo tienen sentido sobre un informe ya generado. */
  protected readonly canExport = computed(() => this.generated() && !this.isBusy());

  // ── Acciones ──────────────────────────────────────────────────────────────

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

  protected exportExcel(): void {
    this.descargar('excel', this.isExportingExcel, `${this.archivo}.xlsx`);
  }

  protected exportPdf(): void {
    this.descargar('pdf', this.isExportingPdf, `${this.archivo}.pdf`);
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /**
   * Traduce el formulario al contrato del backend. Los informes con parámetros
   * extra lo sobrescriben y agregan los suyos sobre esta base.
   */
  protected buildParams(): TParams {
    return buildInformeCuentasParams(this.form) as TParams;
  }

  /**
   * Descarga el informe en el formato pedido. Mismo endpoint y mismos
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
}
