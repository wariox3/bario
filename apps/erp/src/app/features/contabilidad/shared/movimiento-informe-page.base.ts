import { DestroyRef, computed, inject, signal, type WritableSignal } from '@angular/core';
import { FormBuilder, type AbstractControl, type ValidatorFn } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import type { PaginatorState } from 'primeng/paginator';
import { FileDownloadService, I18nService, TenantService, ToastService } from '@reddoc/core';
import type { FilterCondition } from '@reddoc/core';
import type { BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import type { MovimientoInformeService } from './movimiento-informe.service';
import type {
  InformeMontoColumn,
  InformeTotales,
  MovimientoInformeParams,
} from './movimiento-informe.types';
import {
  buildMovimientoInformeForm,
  buildMovimientoInformeParams,
} from './movimiento-informe.utils';

/** Filas por página. Mismo default que el resto de los listados del ERP. */
const PAGE_SIZE_DEFAULT = 25;

/**
 * Base de las páginas de los informes contables, los nueve que pegan a
 * `/contabilidad/movimiento-informe/`.
 *
 * Todas hacen lo mismo —armar los parámetros, generar, paginar y descargar el
 * Excel— y solo cambian el informe, el nombre visible y el nombre del archivo.
 *
 * Lo que aporta:
 *  - El formulario de parámetros (`form`) con su validador de rango.
 *  - `generar()`, `onPageChange()`, `exportExcel()`, `exportPdf()` y los flags
 *    de progreso.
 *  - `generated`, que distingue "todavía no generaste" de "no hay resultados".
 *  - `paramsStale`, que avisa cuando lo que se ve dejó de corresponder al
 *    formulario.
 *  - Las migas, derivadas del módulo activo.
 *
 * Lo que cada informe declara: `service`, `nombre`, `archivo` y —si necesita
 * otra regla de fechas o filtros propios— `rangeValidator()` y `extraFilters()`.
 *
 * El PDF entra por el mismo camino que el Excel pero llega apagado: el endpoint
 * de la familia todavía no sirve `pdf/`. El informe que lo tenga confirmado
 * enciende `soportaPdf`.
 */
export abstract class MovimientoInformePageBase<TRow> {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly fb = inject(FormBuilder);

  protected readonly t = this.i18n.t;

  // ── A declarar por cada informe ───────────────────────────────────────────

  /** Servicio del informe (declara su discriminador). */
  protected abstract readonly service: MovimientoInformeService<TRow>;

  /** Nombre visible: título de la página y última miga. */
  protected abstract get nombre(): string;

  /** Nombre base de la descarga, sin extensión (p. ej. `'balance-prueba'`). */
  protected abstract readonly archivo: string;

  /**
   * ¿El endpoint sirve el PDF de **este** informe? Apagado para todos hasta que
   * el backend publique la acción `pdf/`; el informe que la tenga confirmada lo
   * sobrescribe en `true` y con eso aparece el botón.
   *
   * Es un interruptor por informe y no uno global porque el ERP anterior solo
   * imprimía algunos, y dejar el botón puesto sin efecto —lo que hacía— es peor
   * que no ofrecerlo.
   */
  protected readonly soportaPdf: boolean = false;

  /**
   * Regla de validación del rango de fechas. `undefined` deja el default de la
   * familia —ambas fechas en el mismo año, que es lo que necesitan los cinco
   * informes jerárquicos por su saldo anterior—; los informes planos, que no lo
   * calculan, pueden devolver `rangoFechas` a secas.
   */
  protected rangeValidator(): ValidatorFn | undefined {
    return undefined;
  }

  /**
   * Filtros propios del informe, además del rango de cuentas. Los informes que
   * acotan por tercero, comprobante o número los arman acá.
   */
  protected extraFilters(): readonly FilterCondition[] {
    return [];
  }

  /**
   * Columnas de importe del informe, en orden. El default son los cuatro saldos
   * de los informes que recorren el plan de cuentas; los **planos** lo
   * sobrescriben, porque ninguno de ellos comparte columnas con este set.
   *
   * Recibe el diccionario de columnas ya resuelto para que las etiquetas sigan
   * al idioma sin que cada informe repita el `inject` del i18n.
   */
  protected montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [
      { field: 'saldo_anterior', label: columns.saldoAnterior },
      { field: 'debito', label: columns.debito },
      { field: 'credito', label: columns.credito },
      { field: 'saldo_final', label: columns.saldoFinal },
    ];
  }

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly form = buildMovimientoInformeForm(this.fb, this.rangeValidator());

  protected readonly rows = signal<readonly TRow[]>([]);
  protected readonly totales = signal<InformeTotales | null>(null);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE_DEFAULT);
  protected readonly isLoading = signal(false);
  protected readonly isExportingExcel = signal(false);
  protected readonly isExportingPdf = signal(false);
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

  /** Texto del aviso de la botonera; vacío = no hay nada que avisar. */
  protected readonly hint = computed(() =>
    this.paramsStale() ? this.t().entities.informeCuentas.paramsStale : '',
  );

  /** La descarga solo tiene sentido sobre un informe ya generado. */
  protected readonly canExport = computed(() => this.generated() && !this.isBusy());

  /** Las columnas de importe que la tabla debe pintar, ya traducidas. */
  protected readonly montos = computed<readonly InformeMontoColumn[]>(() =>
    this.montosDe(this.t().entities.informeCuentas.columns),
  );

  constructor() {
    this.watchParam(this.form);
  }

  /**
   * Suma un control a la vigilancia de `paramsStale`: cualquier cambio después
   * de generar deja viejo lo que se ve en la tabla.
   *
   * El formulario compartido ya queda vigilado. Los informes con parámetros
   * propios llaman a esto **desde su propio constructor**, no antes: los campos
   * de una subclase se inicializan después de que corre el constructor de la
   * base, así que un hook que los leyera desde acá los encontraría `undefined`.
   */
  protected watchParam(control: AbstractControl): void {
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
    this.descargar(this.service.exportUrl, `${this.archivo}.xlsx`, this.isExportingExcel);
  }

  /**
   * PDF del informe **completo**. Misma llamada que el Excel salvo la acción y
   * la extensión: el backend recibe el mismo body y devuelve otro binario.
   */
  protected exportPdf(): void {
    this.descargar(this.service.pdfUrl, `${this.archivo}.pdf`, this.isExportingPdf);
  }

  /**
   * Descarga binaria del informe completo. Las dos salidas comparten verbo,
   * body y manejo de error; lo único propio de cada una es a qué acción pega,
   * cómo se llama el archivo y qué botón muestra su spinner.
   */
  private descargar(url: string, archivo: string, progreso: WritableSignal<boolean>): void {
    if (!this.canExport()) return;
    progreso.set(true);
    this.fileDownload
      .download(url, {
        method: 'POST',
        body: this.service.buildBody(this.buildParams()),
        fallbackFilename: archivo,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => progreso.set(false)),
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

  /** Traduce el formulario al body del informe, con los filtros propios sumados. */
  protected buildParams(): MovimientoInformeParams {
    return buildMovimientoInformeParams(this.form, this.extraFilters());
  }

  private consultar(): void {
    const params = this.buildParams();

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
