import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { I18nService, TenantService, toIsoDate, type SortSpec } from '@reddoc/core';
import {
  DataTableComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { MascaraFechaDirective } from '@reddoc/ui';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import {
  CELL_ACTION_DOCUMENTOS,
  COLUMNS,
  ESTADOS,
  ORIGENES,
  toCorreoRecibidoRow,
  type CorreoRecibidoRow,
} from '../../correo-recibido.constants';
import type {
  CorreoRecibidoEstado,
  CorreoRecibidoOrden,
  CorreoRecibidoOrigen,
  CorreoRecibidoQuery,
} from '../../correo-recibido.model';
import { CorreoRecibidoService } from '../../correo-recibido.service';

const PAGE_SIZE = 25;
/** Orden del backend cuando no se pide otro: los más recientes primero. */
const DEFAULT_SORT: readonly SortSpec[] = [{ field: 'recibido_en', direction: 'desc' }];

function inicioDeMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

function finDeMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/**
 * Correos (Compra › Recepción): cada correo que llegó al buzón —o archivo que se
 * cargó a mano—, en qué estado quedó y, si falló, por qué. Es la pantalla de
 * soporte para cuando un proveedor dice que envió la factura y no aparece.
 *
 * Misma barra que Documentos (búsqueda, estado, origen y rango de llegada, que
 * arranca en el mes en curso). La cantidad de documentos de cada correo abre
 * Documentos filtrado por ese correo.
 */
@Component({
  selector: 'app-correos-recibidos-list',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    MascaraFechaDirective,
    ListShellComponent,
    DataTableComponent,
  ],
  templateUrl: './correos-recibidos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorreosRecibidosListComponent {
  private readonly service = inject(CorreoRecibidoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly activeModule = inject(ActiveModuleStore);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  protected readonly columns = COLUMNS;

  // ── Filtros ───────────────────────────────────────────────────────────────
  protected readonly busquedaInput = signal('');
  private readonly busqueda = signal('');
  protected readonly estado = signal<CorreoRecibidoEstado | null>(null);
  protected readonly origen = signal<CorreoRecibidoOrigen | null>(null);
  protected readonly desde = signal<Date | null>(inicioDeMes());
  protected readonly hasta = signal<Date | null>(finDeMes());

  // ── Tabla ─────────────────────────────────────────────────────────────────
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE);
  protected readonly sort = signal<readonly SortSpec[]>(DEFAULT_SORT);
  protected readonly items = signal<readonly CorreoRecibidoRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(true);

  protected readonly estadoOptions = computed(() => {
    const estados = this.t().entities.correoRecibido.estados;
    return ESTADOS.map((value) => ({ value, label: estados[value] }));
  });

  protected readonly origenOptions = computed(() => {
    const origenes = this.t().entities.correoRecibido.origenes;
    return ORIGENES.map((value) => ({ value, label: origenes[value] }));
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.correoRecibido.name },
    ];
  });

  private readonly query = computed<CorreoRecibidoQuery>(() => {
    const orden = this.sort()[0];
    return {
      page: this.currentPage() + 1,
      page_size: this.pageSize(),
      search: this.busqueda().trim() || undefined,
      estado: this.estado() ?? undefined,
      origen: this.origen() ?? undefined,
      desde: toIsoDate(this.desde()) ?? undefined,
      hasta: toIsoDate(this.hasta()) ?? undefined,
      ordering: orden
        ? ((orden.direction === 'desc' ? `-${orden.field}` : orden.field) as CorreoRecibidoOrden)
        : undefined,
    };
  });

  constructor() {
    toObservable(this.busquedaInput)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((texto) => {
        this.busqueda.set(texto);
        this.currentPage.set(0);
      });

    toObservable(this.query)
      .pipe(
        switchMap((query) => {
          this.isLoading.set(true);
          return this.service.listar(query).pipe(
            catchError(() => of(null)),
            finalize(() => this.isLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.items.set(res ? res.results.map(toCorreoRecibidoRow) : []);
        this.totalCount.set(res?.count ?? 0);
      });
  }

  protected onEstado(estado: CorreoRecibidoEstado | null): void {
    this.estado.set(estado);
    this.currentPage.set(0);
  }

  protected onOrigen(origen: CorreoRecibidoOrigen | null): void {
    this.origen.set(origen);
    this.currentPage.set(0);
  }

  protected onDesde(fecha: Date | null): void {
    this.desde.set(fecha);
    this.currentPage.set(0);
  }

  protected onHasta(fecha: Date | null): void {
    this.hasta.set(fecha);
    this.currentPage.set(0);
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.pageSize.set(event.pageSize);
    this.currentPage.set(event.page);
  }

  protected onSortChange(sort: readonly SortSpec[]): void {
    this.sort.set(sort.length > 0 ? sort.slice(0, 1) : DEFAULT_SORT);
    this.currentPage.set(0);
  }

  /**
   * Abre Documentos filtrado por el correo. Documentos filtra la emisión y sin
   * fechas cae al mes en curso, así que se le pasa el rango de emisión de los
   * documentos del correo: una factura de septiembre que llegó en octubre
   * también aparece.
   */
  protected onCellAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== CELL_ACTION_DOCUMENTOS) return;
    const correo = event.row as CorreoRecibidoRow;
    const slug = this.tenant.currentSlug();
    if (!slug || correo.documentos.length === 0) return;
    const fechas = correo.documentos.map((d) => d.fecha_emision).sort();
    void this.router.navigate(
      ['/t', slug, currentModuleId(this.activeModule), 'recepcion', 'documentos'],
      {
        queryParams: {
          correo: correo.id,
          desde: fechas[0],
          hasta: fechas[fechas.length - 1],
        },
      },
    );
  }
}
