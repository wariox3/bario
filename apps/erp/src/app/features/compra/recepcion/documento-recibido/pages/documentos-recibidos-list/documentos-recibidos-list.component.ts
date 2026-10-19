import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { MascaraFechaDirective } from '@reddoc/ui';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import {
  ACCIONES_RECEPCION_ROW,
  buscarAccionRecepcion,
  type AccionRecepcion,
} from '../../documento-recibido.acciones';
import { CargarDocumentoDialogComponent } from '../../components/cargar-documento-dialog/cargar-documento-dialog.component';
import {
  COLUMNS,
  ESTADOS_RECEPCION,
  ROW_ACTIONS,
  ROW_ACTION_DETALLE,
  TIPOS,
} from '../../documento-recibido.constants';
import {
  toDocumentoRecibidoRow,
  type DocumentoRecibido,
  type DocumentoRecibidoOrden,
  type DocumentoRecibidoQuery,
  type DocumentoRecibidoRow,
  type DocumentoRecibidoTipo,
  type EstadoRecepcionFiltro,
} from '../../documento-recibido.model';
import { DocumentoRecibidoService } from '../../documento-recibido.service';

const PAGE_SIZE = 25;
/** Orden del backend cuando no se pide otro: los más recientes primero. */
const DEFAULT_SORT: readonly SortSpec[] = [{ field: 'fecha_emision', direction: 'desc' }];

/**
 * Documentos recibidos (Compra › Recepción): la bandeja de lo que los
 * proveedores mandan al buzón del emisor en RedEDoc.
 *
 * Los filtros van a la vista en la barra —búsqueda, tipo y rango de emisión—
 * porque el endpoint no habla `campo__operador` sino parámetros propios. Arranca
 * en los documentos sin recepción y sin fechas: vacías no viajan y el backend
 * decide el rango. A la derecha, **Cargar archivo** para lo que no llegó por
 * correo.
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
    ConfirmDialogModule,
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
  providers: [ConfirmationService],
  templateUrl: './documentos-recibidos-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosRecibidosListComponent {
  private readonly service = inject(DocumentoRecibidoService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  protected readonly columns = COLUMNS;
  /** Ver detalle (en línea) y, en el menú, las acciones que el estado de cada fila habilite. */
  protected readonly rowActions = [...ROW_ACTIONS, ...ACCIONES_RECEPCION_ROW];

  // ── Filtros ───────────────────────────────────────────────────────────────
  /** Lo que se escribe; la búsqueda que viaja es `busqueda`, ya con debounce. */
  protected readonly busquedaInput = signal('');
  private readonly busqueda = signal('');
  protected readonly tipo = signal<DocumentoRecibidoTipo | null>(null);
  protected readonly estadoRecepcion = signal<EstadoRecepcionFiltro>('no');
  protected readonly desde = signal<Date | null>(null);
  protected readonly hasta = signal<Date | null>(null);
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

  protected readonly estadoRecepcionOptions = computed(() => {
    const estados = this.t().entities.documentoRecibido.filtros.estadosRecepcion;
    return ESTADOS_RECEPCION.map((value) => ({ value, label: estados[value] }));
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
      estado_recepcion:
        this.estadoRecepcion() === 'todos' ? undefined : this.estadoRecepcion() === 'si',
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

  protected onEstadoRecepcion(estado: EstadoRecepcionFiltro): void {
    this.estadoRecepcion.set(estado);
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

  /** La ficha se abre con el CUE y la fecha: el backend no tiene `GET` por id. */
  protected onRowAction(event: RowActionInvokedEvent): void {
    const doc = event.row as DocumentoRecibidoRow;
    if (event.actionId === ROW_ACTION_DETALLE) {
      void this.router.navigate(['detalle', doc.id], {
        relativeTo: this.route,
        queryParams: { cue: doc.cufe_cude, fecha: doc.fecha_emision },
      });
      return;
    }
    const accion = buscarAccionRecepcion(event.actionId);
    if (accion?.habilitada(doc)) this.solicitarAccion(accion, doc);
  }

  /** Confirma (si la acción lo pide) y ejecuta. */
  private solicitarAccion(accion: AccionRecepcion, doc: DocumentoRecibido): void {
    if (!accion.confirmar) {
      this.ejecutarAccion(accion, doc);
      return;
    }
    const textos = this.t().entities.documentoRecibido.acciones[accion.id];
    this.confirmation.confirm({
      header: textos.confirmar.header,
      message: textos.confirmar.message.replace('{numero}', doc.numero),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: textos.label,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: accion.severity === 'danger' ? 'p-button-danger' : undefined,
      accept: () => this.ejecutarAccion(accion, doc),
    });
  }

  /** Un 400 lo avisa el interceptor con el mensaje del backend. */
  private ejecutarAccion(accion: AccionRecepcion, doc: DocumentoRecibido): void {
    accion
      .ejecutar(this.service, doc)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const exito = this.t().entities.documentoRecibido.acciones[accion.id].exito;
        this.toast.success(exito.title, exito.desc.replace('{numero}', doc.numero));
        this.recargas.update((n) => n + 1);
      });
  }

  protected onCargado(): void {
    const c = this.t().entities.documentoRecibido.carga;
    this.toast.success(c.exito.title, c.exito.desc);
    this.recargas.update((n) => n + 1);
  }
}
