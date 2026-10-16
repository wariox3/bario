import { inject } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { EMPTY, from, of, type Observable } from 'rxjs';
import { catchError, filter, finalize, switchMap } from 'rxjs/operators';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
  alcanceImpresion,
  extractBlobErrorMessage,
  type DocumentEntityConfig,
  type ListQuery,
} from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import type { ImprimirConfirmData } from './imprimir-confirm-modal.component';

/**
 * Base de "Imprimir" e "Imprimir zip" en el listado de documentos. Las dos
 * mandan el mismo body que el listado y solo cambian el endpoint (`descargar`).
 *
 * Qué se imprime lo decide `alcanceImpresion` (`@reddoc/core`), la misma regla
 * que usa el historial del POS: la selección, o lo filtrado, o nada.
 */
export abstract class ImprimirListaBaseStrategy implements EntityActionStrategy {
  abstract readonly id: string;
  abstract readonly toolbarAction: ToolbarAction;

  protected readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita disparar dos impresiones si se clickea repetido antes de terminar. */
  private imprimiendo = false;

  protected abstract descargar(document: DocumentEntityConfig, query: ListQuery): Observable<void>;

  execute(ctx: EntityActionContext): Observable<void> {
    if (this.imprimiendo) return EMPTY;
    const dict = this.i18n.t().documentActions.imprimirLista;
    const alcance = alcanceImpresion(ctx.query, ctx.selectedIds, ctx.totalCount);
    if (alcance.tipo === 'sin-criterio') {
      this.toast.warn(dict.sinCriterio.title, dict.sinCriterio.desc);
      return EMPTY;
    }
    if (alcance.tipo === 'vacio') {
      this.toast.warn(dict.vacio.title, dict.vacio.desc);
      return EMPTY;
    }

    return this.confirmar(alcance.cantidad, alcance.confirmar).pipe(
      filter((confirmado) => confirmado),
      switchMap(() => {
        this.imprimiendo = true;
        this.toast.info(dict.generando.title, dict.generando.desc);
        return this.descargar(ctx.document, alcance.query).pipe(
          catchError((err: unknown) => {
            void extractBlobErrorMessage(err, dict.error.desc).then((mensaje) =>
              this.toast.error(dict.error.title, mensaje),
            );
            return EMPTY;
          }),
          finalize(() => {
            this.imprimiendo = false;
          }),
        );
      }),
    );
  }

  /**
   * Modal propio y no `p-confirmDialog`: el strategy vive en root y el
   * `ConfirmationService` del listado es de componente. Se carga lazy.
   */
  private confirmar(cantidad: number, preguntar: boolean): Observable<boolean> {
    if (!preguntar) return of(true);
    const data: ImprimirConfirmData = { cantidad };
    return from(import('./imprimir-confirm-modal.component')).pipe(
      switchMap(({ ImprimirConfirmModalComponent }) => {
        const ref = this.dialog.open(ImprimirConfirmModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '26rem',
          data,
        });
        return ref ? ref.onClose : EMPTY;
      }),
      filter((confirmado: unknown): confirmado is boolean => confirmado === true),
    );
  }
}
