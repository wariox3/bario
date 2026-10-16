import { inject } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { EMPTY, from, of, type Observable } from 'rxjs';
import { catchError, filter, finalize, switchMap } from 'rxjs/operators';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
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
 * Por encima de este número de documentos se pide confirmación: un PDF de
 * cientos de documentos tarda y conviene que sea a propósito.
 */
const UMBRAL_CONFIRMACION = 50;

/**
 * Base de "Imprimir" e "Imprimir zip" en el listado de documentos. Las dos
 * mandan el mismo body que el listado y solo cambian el endpoint (`descargar`).
 *
 * Qué se imprime:
 *  - Con filas marcadas, solo esas (se suma `id in [...]` a los filtros).
 *  - Sin selección, todo lo que cumple los filtros activos, no solo la página.
 *  - Sin selección ni filtros, nada: avisa en vez de pedir al backend todos los
 *    documentos del tipo. Cuentan solo los filtros de la persona; los implícitos
 *    del documento (`documento_tipo_id`, `defaultFilters`) los suma el gateway.
 *
 * Sin nada que imprimir avisa sin pedir nada; por encima de
 * `UMBRAL_CONFIRMACION` documentos pregunta antes, con el total.
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
    const seleccion = ctx.selectedIds;
    if (seleccion.length === 0 && ctx.query.filters.length === 0) {
      this.toast.warn(dict.sinCriterio.title, dict.sinCriterio.desc);
      return EMPTY;
    }

    const cantidad = seleccion.length > 0 ? seleccion.length : ctx.totalCount;

    if (cantidad === 0) {
      this.toast.warn(dict.vacio.title, dict.vacio.desc);
      return EMPTY;
    }

    const query: ListQuery =
      seleccion.length > 0
        ? {
            ...ctx.query,
            filters: [...ctx.query.filters, { field: 'id', operator: 'in', value: seleccion }],
          }
        : ctx.query;

    return this.confirmar(cantidad).pipe(
      filter((confirmado) => confirmado),
      switchMap(() => {
        this.imprimiendo = true;
        this.toast.info(dict.generando.title, dict.generando.desc);
        return this.descargar(ctx.document, query).pipe(
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
  private confirmar(cantidad: number): Observable<boolean> {
    if (cantidad <= UMBRAL_CONFIRMACION) return of(true);
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
