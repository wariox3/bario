import { Injectable, inject } from '@angular/core';
import { EMPTY, from, type Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { DOCUMENT_TYPE_ID, extractErrorMessage, I18nService, ToastService } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { DialogService } from 'primeng/dynamicdialog';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarRecurrenteService } from './generar-recurrente.service';

/**
 * Tipo de la factura real que nace de cada plantilla recurrente.
 *
 * El backend genera con un par origen → destino: aquí el origen es el documento
 * anfitrión (`ctx.document.documentTypeId`) y el destino sale de este mapa. Un
 * tipo que no esté mapeado no puede generar, y la acción lo dice en vez de
 * mandar un payload a ciegas.
 */
const DESTINO_POR_RECURRENTE: Readonly<Record<number, number>> = {
  [DOCUMENT_TYPE_ID.FACTURA_COMPRA_RECURRENTE]: DOCUMENT_TYPE_ID.COMPRA,
  [DOCUMENT_TYPE_ID.FACTURA_VENTA_RECURRENTE]: DOCUMENT_TYPE_ID.FACTURA_VENTA,
};

/**
 * Acción "Generar seleccionados": genera facturas reales a partir de las
 * **plantillas recurrentes** seleccionadas (checkbox) en el listado.
 *
 * Opera sobre `ctx.selectedIds` (los ids marcados). Sin selección, avisa y no
 * hace HTTP. Luego pide el **período** (mes/año) en el modal compartido —el
 * backend lo exige siempre, es la fecha de las facturas que se crean— y al
 * terminar recarga la lista para reflejar el estado.
 *
 * La variante "Generar todos" (sobre el filtro completo) queda pendiente para
 * una v2 —el endpoint la admite omitiendo `documento_ids`, falta definir la UX—;
 * por eso esta acción es explícitamente "seleccionados".
 */
@Injectable()
export class GenerarRecurrenteSeleccionadosActionStrategy implements EntityActionStrategy {
  readonly id = 'generar-recurrente-seleccionados';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generarRecurrente.seleccionadosLabel',
    iconClass: 'pi pi-bolt',
  };

  private readonly dialog = inject(DialogService);
  private readonly api = inject(GenerarRecurrenteService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita disparos concurrentes si se clickea repetido antes de terminar. */
  private generating = false;

  execute(ctx: EntityActionContext): Observable<void> {
    const dict = this.i18n.t().documentActions.generarRecurrente;

    if (ctx.selectedIds.length === 0) {
      this.toast.warn(dict.noSelection.title, dict.noSelection.desc);
      return EMPTY;
    }

    const origen = ctx.document.documentTypeId;
    const destino = DESTINO_POR_RECURRENTE[origen];
    if (destino === undefined) {
      this.toast.error(dict.error.title, dict.sinDestino);
      return EMPTY;
    }

    if (this.generating) return EMPTY;

    // El modal se carga lazy: mantiene el datepicker fuera del bundle inicial
    // (el strategy se provee eager en root). Mismo patrón que la acción "generar".
    return from(import('../generar/generar-documento-modal.component')).pipe(
      switchMap(({ GenerarDocumentoModalComponent }) => {
        const ref = this.dialog.open(GenerarDocumentoModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '27rem',
          data: {
            modalHeader: dict.modalHeader,
            modalSubtitle: dict.modalSubtitle,
            periodoLabel: dict.periodoLabel,
            submit: dict.submit,
            cancel: dict.cancel,
          },
        });
        return ref ? ref.onClose : EMPTY;
      }),
      // El modal cierra con `null` al cancelar: solo seguimos con un período real.
      filter((periodo: unknown): periodo is Date => periodo instanceof Date),
      switchMap((periodo) => {
        this.generating = true;
        return this.api
          .generar({
            documento_tipo_id: origen,
            documento_tipo_id_destino: destino,
            documento_ids: ctx.selectedIds.map((id) => Number(id)),
            mes: periodo.getMonth() + 1,
            anio: periodo.getFullYear(),
          })
          .pipe(
            tap((res) => {
              this.generating = false;
              if (res.count === 0) {
                this.toast.info(dict.empty.title, dict.empty.desc);
                return;
              }
              this.toast.success(dict.success.title, dict.success.desc);
              ctx.reload();
            }),
            catchError((err: unknown) => {
              this.generating = false;
              this.toast.error(dict.error.title, extractErrorMessage(err, dict.error.desc));
              return EMPTY;
            }),
          );
      }),
      map(() => void 0),
    );
  }
}
