import { Component, DestroyRef, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { I18nService, ToastService, type ModelGrants } from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowAction,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import { MODELO, ModelPermissionsService } from '@erp/core/permissions';
import { AccessDeniedComponent } from '@erp/core/components/access-denied/access-denied.component';
import type { AppDict } from '@erp/i18n';
import { ConceptoConfiguracionService } from '../../../concepto/concepto.service';
import type { Concepto, ConceptoRow } from '../../../concepto/concepto.model';
import { toConceptoRow } from '../../../concepto/concepto.mapper';
import { CONCEPTO_COLUMNS } from '../../../concepto/concepto.constants';
import { HUMANO_TABLE_HEIGHT } from '../humano-config.constants';
import { ConceptoCuentasDialogComponent } from '../concepto-cuentas-dialog/concepto-cuentas-dialog.component';

/** Tamaño de página inicial. El backend devuelve todo; se pagina en el cliente. */
const PAGE_SIZE_INICIAL = 25;

/** Sin permisos cargados todavía, nada se puede tocar. */
const SIN_PERMISOS: ModelGrants = { ver: false, crear: false, editar: false, eliminar: false };

/** Abre las cuentas del concepto. `inline` por ser la razón de ser de la tabla. */
const CUENTAS_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: 'cuentas',
    labelKey: 'configuracion.humano.concepto.actions.cuentas',
    iconClass: 'pi pi-pencil',
    inline: true,
  },
];

/**
 * Tabla de conceptos dentro del área Humano de la configuración.
 *
 * Lista el catálogo; lo que se configura de cada concepto son sus cuentas
 * contables por tipo de costo, que se abren en un modal desde el lápiz de la
 * fila. El lápiz solo aparece si la persona puede ver esas cuentas.
 */
@Component({
  selector: 'app-concepto-table',
  standalone: true,
  imports: [
    DataTableComponent,
    ButtonModule,
    AccessDeniedComponent,
    ConceptoCuentasDialogComponent,
  ],
  templateUrl: './concepto-table.component.html',
})
export class ConceptoTableComponent {
  private readonly service = inject(ConceptoConfiguracionService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly locale = inject(LOCALE_ID);

  protected readonly t = this.i18n.t;

  private readonly rows = signal<readonly ConceptoRow[]>([]);
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

  /** Permisos sobre las cuentas del concepto (`HumConceptoCuenta`), no sobre el concepto. */
  protected readonly cuentasGrants = signal<ModelGrants>(SIN_PERMISOS);
  protected readonly rowActions = computed(() =>
    this.cuentasGrants().ver ? CUENTAS_ROW_ACTIONS : [],
  );

  protected readonly selected = signal<Concepto | null>(null);
  protected readonly dialogVisible = signal(false);

  protected readonly columns = CONCEPTO_COLUMNS;
  protected readonly tableHeight = HUMANO_TABLE_HEIGHT;

  constructor() {
    this.modelPermissions
      .load(MODELO.humano.conceptoCuenta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((grants) => this.cuentasGrants.set(grants));

    // Los grants se piden antes de listar: sin permiso de ver, la petición
    // sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.humano.concepto)
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
        next: (respuesta) =>
          this.rows.set(respuesta.map((concepto) => toConceptoRow(concepto, this.locale))),
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.humano.concepto.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== 'cuentas') return;
    this.selected.set(event.row as Concepto);
    this.dialogVisible.set(true);
  }
}
