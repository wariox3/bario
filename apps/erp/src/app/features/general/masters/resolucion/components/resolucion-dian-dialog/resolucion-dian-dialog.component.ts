import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import {
  DataTableComponent,
  type PageChangeEvent,
  type RowActionInvokedEvent,
} from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ResolucionService } from '../../resolucion.service';
import type { ResolucionDian, ResolucionDianRow } from '../../resolucion.model';
import { marcarImportadas, prefijosYNumerosDe } from '../../utils/resolucion-dian.utils';
import {
  RESOLUCIONES_DIAN_COLUMNS,
  RESOLUCIONES_DIAN_IMPORTAR_ACTION_ID,
  RESOLUCIONES_DIAN_PAGE_SIZE,
  RESOLUCIONES_DIAN_ROW_ACTIONS,
} from '../../resolucion.constants';

/**
 * Modal **Lista** del dropdown "DIAN": las resoluciones que el servicio de
 * facturación electrónica tiene del emisor de la empresa (`lista-dian/`).
 *
 * Cada fila se puede **importar** (`importar-dian/`): crea la resolución en la
 * empresa ya validada y avisa con `imported` para que el listado recargue. Las
 * que la empresa ya tiene (mismo prefijo y número) se marcan `importada` y no
 * ofrecen el botón: se cruzan con una consulta extra a `lista/` por página. Sin
 * `puedeImportar` la tabla queda de solo consulta. La lista se pide al abrir y se vacía al cerrar, para que la
 * próxima apertura no muestre la respuesta anterior mientras llega la nueva.
 * El backend pagina de a 10 y sin elegir tamaño, así que el paginador no lo
 * ofrece.
 */
@Component({
  selector: 'app-resolucion-dian-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, DataTableComponent],
  templateUrl: './resolucion-dian-dialog.component.html',
  styleUrl: './resolucion-dian-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolucionDianDialogComponent {
  private readonly service = inject(ResolucionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  /** Importar crea una resolución: el host lo pasa con el permiso de crear. */
  readonly puedeImportar = input<boolean>(false);
  readonly imported = output<void>();

  protected readonly columns = RESOLUCIONES_DIAN_COLUMNS;
  protected readonly pageSize = RESOLUCIONES_DIAN_PAGE_SIZE;
  protected readonly rowsPerPageOptions = [RESOLUCIONES_DIAN_PAGE_SIZE] as const;

  protected readonly items = signal<readonly ResolucionDianRow[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly currentPage = signal(0);
  protected readonly isLoading = signal(false);
  /** Id (del servicio) de la fila que se está importando. */
  protected readonly importandoId = signal<number | null>(null);

  protected readonly rowActions = computed(() =>
    this.puedeImportar() ? RESOLUCIONES_DIAN_ROW_ACTIONS : [],
  );

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.items.set([]);
        this.totalCount.set(0);
        this.currentPage.set(0);
        return;
      }
      untracked(() => this.cargar());
    });
  }

  protected onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.page);
    this.cargar();
  }

  protected onRowAction(event: RowActionInvokedEvent): void {
    if (event.actionId !== RESOLUCIONES_DIAN_IMPORTAR_ACTION_ID) return;
    this.importar(event.row as ResolucionDian);
  }

  protected onClose(): void {
    this.visible.set(false);
  }

  private importar(resolucion: ResolucionDian): void {
    if (this.importandoId() !== null) return;
    const toasts = this.t().entities.resolucion.dian.toasts;
    this.importandoId.set(resolucion.id);
    this.service
      .importarDian(resolucion.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importandoId.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.importSuccess.title, toasts.importSuccess.desc);
          this.imported.emit();
          // Recarga la página para que la fila quede marcada como importada.
          this.cargar();
        },
        // 400: ya existe con ese número y prefijo; 404: sin emisor o ajena a él.
        error: (err: unknown) =>
          this.toast.error(
            toasts.importError.title,
            extractErrorMessage(err, toasts.importError.desc),
          ),
      });
  }

  private cargar(): void {
    const toasts = this.t().entities.resolucion.dian.toasts;
    this.isLoading.set(true);
    this.service
      // El paginador cuenta desde 0; `page` del backend, desde 1.
      .listaDian(this.currentPage() + 1)
      .pipe(
        switchMap((response) => {
          if (response.results.length === 0) return of({ response, existentes: [] });
          const { prefijos, numeros } = prefijosYNumerosDe(response.results);
          return this.service.existentes(prefijos, numeros).pipe(
            // Sin el cruce la lista igual sirve: el backend frena el duplicado.
            catchError(() => of([])),
            map((existentes) => ({ response, existentes })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ response, existentes }) => {
          this.items.set(marcarImportadas(response.results, existentes));
          this.totalCount.set(response.count);
        },
        // 404: la empresa no tiene emisor configurado.
        error: (err: unknown) => {
          this.items.set([]);
          this.totalCount.set(0);
          this.toast.error(toasts.loadError.title, extractErrorMessage(err, toasts.loadError.desc));
        },
      });
  }
}
