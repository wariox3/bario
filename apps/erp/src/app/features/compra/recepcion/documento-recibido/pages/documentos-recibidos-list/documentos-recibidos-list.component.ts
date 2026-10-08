import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import {
  I18nService,
  TenantService,
  ToastService,
  fromIsoDate,
  toIsoDate,
  type SortSpec,
} from '@reddoc/core';
import {
  DataTableComponent,
  ListShellComponent,
  type BreadcrumbItem,
  type PageChangeEvent,
} from '@reddoc/feature-base';
import { MascaraFechaDirective } from '@reddoc/ui';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { CargarDocumentoDialogComponent } from '../../components/cargar-documento-dialog/cargar-documento-dialog.component';
import { COLUMNS, TIPOS } from '../../documento-recibido.constants';
import {
  toDocumentoRecibidoRow,
  type DocumentoRecibidoOrden,
  type DocumentoRecibidoQuery,
  type DocumentoRecibidoRow,
  type DocumentoRecibidoTipo,
} from '../../documento-recibido.model';
import { DocumentoRecibidoService } from '../../documento-recibido.service';

const PAGE_SIZE = 25;
/** Orden del backend cuando no se pide otro: los más recientes primero. */
const DEFAULT_SORT: readonly SortSpec[] = [{ field: 'fecha_emision', direction: 'desc' }];

function inicioDeMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

function finDeMes(): Date {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/**
 * Documentos recibidos (Compra › Recepción): la bandeja de lo que los
 * proveedores mandan al buzón del emisor en RedEDoc.
 *
 * Los filtros van a la vista en la barra —búsqueda, tipo y rango de emisión—
 * porque el endpoint no habla `campo__operador` sino parámetros propios. El
 * rango arranca en el mes en curso, que es lo que el backend aplica sin fechas:
 * así la pantalla dice qué está mostrando. A la derecha, **Cargar archivo**
 * para lo que no llegó por correo.
 *
 * Desde Correos se llega con `?correo=&desde=&hasta=`: los documentos que salieron
 * de ese correo, con un chip para quitar el filtro y volver a la bandeja.
 */
@Component({
  selector: 'app-documentos-recibidos-list',
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
    CargarDocumentoDialogComponent,
  ],
  templateUrl: './documentos-recibidos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosRecibidosListComponent {
  private readonly service = inject(DocumentoRecibidoService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  protected readonly columns = COLUMNS;

  // ── Filtros ───────────────────────────────────────────────────────────────
  /** Lo que se escribe; la búsqueda que viaja es `busqueda`, ya con debounce. */
  protected readonly busquedaInput = signal('');
  private readonly busqueda = signal('');
  protected readonly tipo = signal<DocumentoRecibidoTipo | null>(null);
  protected readonly desde = signal<Date | null>(inicioDeMes());
  protected readonly hasta = signal<Date | null>(finDeMes());
  /** Correo del que salieron los documentos, si se llegó desde Correos. */
  protected readonly correo = signal<number | null>(null);

  // ── Tabla ─────────────────────────────────────────────────────────────────
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE);
  protected readonly sort = signal<readonly SortSpec[]>(DEFAULT_SORT);
  protected readonly items = signal<readonly DocumentoRecibidoRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(true);
  /** Cambia para forzar una recarga con la misma consulta (tras cargar un archivo). */
  private readonly recargas = signal(0);

  protected readonly cargaVisible = signal(false);

  protected readonly tipoOptions = computed(() => {
    const tipos = this.t().entities.documentoRecibido.tipos;
    return TIPOS.map((value) => ({ value, label: tipos[value] }));
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, currentModuleId(this.activeModule)] : undefined,
      },
      { label: this.t().entities.documentoRecibido.name },
    ];
  });

  private readonly query = computed<DocumentoRecibidoQuery>(() => {
    const orden = this.sort()[0];
    this.recargas();
    return {
      page: this.currentPage() + 1,
      page_size: this.pageSize(),
      search: this.busqueda().trim() || undefined,
      documento_tipo: this.tipo() ?? undefined,
      correo: this.correo() ?? undefined,
      desde: toIsoDate(this.desde()) ?? undefined,
      hasta: toIsoDate(this.hasta()) ?? undefined,
      ordering: orden
        ? ((orden.direction === 'desc' ? `-${orden.field}` : orden.field) as DocumentoRecibidoOrden)
        : undefined,
    };
  });

  constructor() {
    this.leerFiltrosDeUrl();

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
        this.items.set(res ? res.results.map(toDocumentoRecibidoRow) : []);
        this.totalCount.set(res?.count ?? 0);
      });
  }

  /** Toma de la URL el correo y el rango con que lo abre Correos. */
  private leerFiltrosDeUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const correo = Number(params.get('correo'));
    if (Number.isInteger(correo) && correo > 0) this.correo.set(correo);
    const desde = fromIsoDate(params.get('desde'));
    const hasta = fromIsoDate(params.get('hasta'));
    if (desde) this.desde.set(desde);
    if (hasta) this.hasta.set(hasta);
  }

  /** Quita el filtro por correo y lo saca de la URL; el rango queda como está. */
  protected quitarCorreo(): void {
    this.correo.set(null);
    this.currentPage.set(0);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { correo: null, desde: null, hasta: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onTipo(tipo: DocumentoRecibidoTipo | null): void {
    this.tipo.set(tipo);
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

  protected onCargado(): void {
    const c = this.t().entities.documentoRecibido.carga;
    this.toast.success(c.exito.title, c.exito.desc);
    this.recargas.update((n) => n + 1);
  }
}
