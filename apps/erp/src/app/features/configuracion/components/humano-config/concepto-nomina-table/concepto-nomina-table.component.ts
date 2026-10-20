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
import { ConceptoNominaService } from '../../../concepto-nomina/concepto-nomina.service';
import type { ConceptoNomina } from '../../../concepto-nomina/concepto-nomina.model';
import { CONCEPTO_NOMINA_COLUMNS } from '../../../concepto-nomina/concepto-nomina.constants';
import { EDITAR_ROW_ACTIONS, HUMANO_TABLE_HEIGHT } from '../humano-config.constants';
import { ConceptoNominaEditDialogComponent } from '../concepto-nomina-edit-dialog/concepto-nomina-edit-dialog.component';

/** Tamaño de página inicial. El backend devuelve todo; se pagina en el cliente. */
const PAGE_SIZE_INICIAL = 25;

/**
 * Tabla de conceptos de nómina dentro del área Humano de la configuración: qué
 * concepto usa la nómina para cada rubro fijo. Las filas las siembra el
 * backend; solo se cambia el concepto.
 */
@Component({
  selector: 'app-concepto-nomina-table',
  standalone: true,
  imports: [
    DataTableComponent,
    ButtonModule,
    AccessDeniedComponent,
    ConceptoNominaEditDialogComponent,
  ],
  templateUrl: './concepto-nomina-table.component.html',
})
export class ConceptoNominaTableComponent {
  private readonly service = inject(ConceptoNominaService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly rows = signal<readonly ConceptoNomina[]>([]);
  /** Arranca en `true`: hasta saber si puede ver, la tabla muestra su esqueleto. */
  protected readonly isLoading = signal(true);
  protected readonly puedeVer = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(PAGE_SIZE_INICIAL);

  protected readonly totalCount = computed(() => this.rows().length);
  protected readonly items = computed(() => {
    const inicio = this.currentPage() * this.pageSize();
    return this.rows().slice(inicio, inicio + this.pageSize());
  });

  protected readonly selected = signal<ConceptoNomina | null>(null);
  protected readonly dialogVisible = signal(false);

  protected readonly columns = CONCEPTO_NOMINA_COLUMNS;
  protected readonly tableHeight = HUMANO_TABLE_HEIGHT;

  /** El lápiz solo aparece si la persona puede editar. */
  protected readonly acciones = masterActions(MODELO.humano.conceptoNomina, {
    row: EDITAR_ROW_ACTIONS,
  });

  constructor() {
    // Los grants se piden antes de listar: sin permiso de ver, la petición
    // sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.humano.conceptoNomina)
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
          this.rows.set(respuesta);
        },
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.humano.conceptoNomina.toasts;
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
    this.selected.set(event.row as ConceptoNomina);
    this.dialogVisible.set(true);
  }

  protected onSaved(): void {
    this.cargar();
  }
}
