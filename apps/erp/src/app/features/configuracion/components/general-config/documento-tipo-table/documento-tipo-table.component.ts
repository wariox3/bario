import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { I18nService, ToastService, type ListQuery } from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { MODELO, ModelPermissionsService, masterActions } from '@erp/core/permissions';
import { AccessDeniedComponent } from '@erp/core/components/access-denied/access-denied.component';
import type { AppDict } from '@erp/i18n';
import { DocumentoTipoService } from '../../../documento-tipo/documento-tipo.service';
import type { DocumentoTipo, DocumentoTipoRow } from '../../../documento-tipo/documento-tipo.model';
import { toDocumentoTipoRow } from '../../../documento-tipo/documento-tipo.mapper';
import {
  DOCUMENTO_TIPO_COLUMNS,
  DOCUMENTO_TIPO_SORT,
  DOCUMENTO_TIPO_ROW_ACTIONS,
  DOCUMENTO_TIPO_TABLE_HEIGHT,
} from '../../../documento-tipo/documento-tipo.constants';
import { DocumentoTipoEditDialogComponent } from '../documento-tipo-edit-dialog/documento-tipo-edit-dialog.component';

/** Tamaño de página inicial. El `lista/` lo acepta como `limit`, así que manda el front. */
const PAGE_SIZE_INICIAL = 25;

/**
 * Tabla de tipos de documento dentro del área General de la configuración.
 *
 * El catálogo es normativo: no se crea ni se borra, solo se edita el consecutivo
 * y las cuentas de cartera de cada tipo. Por eso no hay toolbar, ni filtros, ni
 * selección múltiple ni ordenamiento por columna; solo la tabla y su lápiz. El
 * orden es fijo (`DOCUMENTO_TIPO_SORT`), el del catálogo.
 */
@Component({
  selector: 'app-documento-tipo-table',
  standalone: true,
  imports: [
    DataTableComponent,
    ButtonModule,
    AccessDeniedComponent,
    DocumentoTipoEditDialogComponent,
  ],
  templateUrl: './documento-tipo-table.component.html',
})
export class DocumentoTipoTableComponent {
  private readonly service = inject(DocumentoTipoService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly items = signal<readonly DocumentoTipoRow[]>([]);
  protected readonly totalCount = signal(0);
  /** Arranca en `true`: hasta saber si puede ver, la tabla muestra su esqueleto. */
  protected readonly isLoading = signal(true);
  protected readonly puedeVer = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE_INICIAL);

  protected readonly selectedTipo = signal<DocumentoTipo | null>(null);
  protected readonly dialogVisible = signal(false);

  protected readonly columns = DOCUMENTO_TIPO_COLUMNS;
  protected readonly tableHeight = DOCUMENTO_TIPO_TABLE_HEIGHT;

  /**
   * El lápiz solo aparece si la persona puede editar tipos de documento.
   * A diferencia de un master, acá nadie pasó por `withPermission` —la ruta de
   * Configuración es más que esta tabla—, así que los grants se piden al montar.
   */
  protected readonly acciones = masterActions(MODELO.general.documentoTipo, {
    row: DOCUMENTO_TIPO_ROW_ACTIONS,
  });

  constructor() {
    // Los grants se piden antes de listar, no en paralelo: sin permiso de ver,
    // la petición sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.general.documentoTipo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((grants) => {
        this.puedeVer.set(grants.ver);
        if (grants.ver) {
          this.cargar();
        } else {
          this.isLoading.set(false);
        }
      });
  }

  private query(): ListQuery {
    return {
      filters: [],
      sort: DOCUMENTO_TIPO_SORT,
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };
  }

  protected cargar(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.service
      .list(this.query())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.items.set(respuesta.results.map(toDocumentoTipoRow));
          this.totalCount.set(respuesta.count);
        },
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.general.documentoTipo.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.cargar();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'edit') return;
    this.selectedTipo.set(event.row as DocumentoTipo);
    this.dialogVisible.set(true);
  }

  protected onSaved(): void {
    this.cargar();
  }
}
