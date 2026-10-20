import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { MODELO, ModelPermissionsService, masterActions } from '@erp/core/permissions';
import { AccessDeniedComponent } from '@erp/core/components/access-denied/access-denied.component';
import type { AppDict } from '@erp/i18n';
import { ImpuestoService } from '../../../impuesto/impuesto.service';
import type { Impuesto, ImpuestoRow } from '../../../impuesto/impuesto.model';
import { toImpuestoRow } from '../../../impuesto/impuesto.mapper';
import {
  IMPUESTO_COLUMNS,
  IMPUESTO_ROW_ACTIONS,
  IMPUESTO_TABLE_HEIGHT,
} from '../../../impuesto/impuesto.constants';
import { ImpuestoEditDialogComponent } from '../impuesto-edit-dialog/impuesto-edit-dialog.component';

/** Tamaño de página inicial. El backend devuelve todo; se pagina en el cliente. */
const PAGE_SIZE_INICIAL = 25;

/**
 * Tabla de impuestos dentro del área General de la configuración.
 *
 * Mismo planteo que la de tipos de documento: catálogo normativo, sin toolbar
 * ni filtros, orden fijo y un lápiz por fila. Lo único editable es la cuenta
 * contable de cada impuesto.
 */
@Component({
  selector: 'app-impuesto-table',
  standalone: true,
  imports: [DataTableComponent, ButtonModule, AccessDeniedComponent, ImpuestoEditDialogComponent],
  templateUrl: './impuesto-table.component.html',
})
export class ImpuestoTableComponent {
  private readonly service = inject(ImpuestoService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Arranca en `true`: hasta saber si puede ver, la tabla muestra su esqueleto. */
  protected readonly isLoading = signal(true);
  protected readonly puedeVer = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE_INICIAL);

  private readonly rows = signal<readonly ImpuestoRow[]>([]);
  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly items = computed(() => {
    const inicio = this.currentPage() * this.pageSize();
    return this.rows().slice(inicio, inicio + this.pageSize());
  });

  protected readonly selectedImpuesto = signal<Impuesto | null>(null);
  protected readonly dialogVisible = signal(false);

  protected readonly columns = IMPUESTO_COLUMNS;
  protected readonly tableHeight = IMPUESTO_TABLE_HEIGHT;

  /** El lápiz solo aparece si la persona puede editar impuestos. */
  protected readonly acciones = masterActions(MODELO.general.impuesto, {
    row: IMPUESTO_ROW_ACTIONS,
  });

  constructor() {
    // Los grants se piden antes de listar: sin permiso de ver, la petición
    // sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.general.impuesto)
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

  protected cargar(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.service
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.rows.set(respuesta.map(toImpuestoRow));
        },
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.general.impuesto.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'edit') return;
    this.selectedImpuesto.set(event.row as Impuesto);
    this.dialogVisible.set(true);
  }

  protected onSaved(): void {
    this.cargar();
  }
}
