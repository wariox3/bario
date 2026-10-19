import { Injectable, inject } from '@angular/core';
import { EMPTY, from, type Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import {
  DOCUMENT_TYPE_ID,
  extractErrorMessage,
  I18nService,
  startOfToday,
  ToastService,
} from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { DialogService } from 'primeng/dynamicdialog';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarRecurrenteService } from '../generar-recurrente/generar-recurrente.service';
import type { ElegirRecurrenteModalData } from './elegir-recurrente-modal.component';

/**
 * Plantilla recurrente de la que sale cada documento real. Es el mapa inverso
 * del de `GenerarRecurrenteBaseStrategy`: acá el anfitrión es el destino (el
 * listado de facturas) y el origen se deduce.
 */
const ORIGEN_POR_DESTINO: Readonly<Record<number, number>> = {
  [DOCUMENT_TYPE_ID.COMPRA]: DOCUMENT_TYPE_ID.FACTURA_COMPRA_RECURRENTE,
};

/**
 * Acción "Recurrente" del listado de facturas: elegir **una** plantilla
 * recurrente y crear desde ella la factura, como el botón del ERP anterior.
 *
 * Abre un modal con las plantillas del tipo de origen; al elegir una manda
 * `POST general/documento/generar-recurrente/` con ese id y el mes en curso.
 * El backend copia la plantilla entera con fecha de hoy y avanza la fecha de
 * la plantilla al mes siguiente, así que repetir la misma en el mismo mes
 * responde `generados: 0`.
 *
 * El backend solo devuelve la cantidad creada, no el id: no se puede abrir la
 * ficha de la factura nueva, así que se recarga el listado, donde aparece
 * primera.
 */
@Injectable()
export class ElegirRecurrenteActionStrategy implements EntityActionStrategy {
  readonly id = 'elegir-recurrente';
  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.elegirRecurrente.buttonLabel',
    iconClass: 'pi pi-replay',
  };

  private readonly dialog = inject(DialogService);
  private readonly api = inject(GenerarRecurrenteService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita disparos concurrentes si se elige repetido antes de terminar. */
  private generating = false;

  execute(ctx: EntityActionContext): Observable<void> {
    const dict = this.i18n.t().documentActions.elegirRecurrente;

    const destino = ctx.document.documentTypeId;
    const origen = ORIGEN_POR_DESTINO[destino];
    if (origen === undefined) {
      this.toast.error(dict.error.title, dict.sinOrigen);
      return EMPTY;
    }
    if (this.generating) return EMPTY;

    const data: ElegirRecurrenteModalData = { documentoTipoOrigen: origen };

    // Lazy: la tabla del modal queda fuera del bundle inicial (los strategies
    // se proveen eager en root).
    return from(import('./elegir-recurrente-modal.component')).pipe(
      switchMap(({ ElegirRecurrenteModalComponent }) => {
        const ref = this.dialog.open(ElegirRecurrenteModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '60rem',
          data,
        });
        return ref ? ref.onClose : EMPTY;
      }),
      // El modal cierra con `null` al cancelar: solo seguimos con un id real.
      filter((id: unknown): id is number => typeof id === 'number'),
      switchMap((plantillaId) => {
        this.generating = true;
        const hoy = startOfToday();
        return this.api
          .generar({
            documento_tipo_origen: origen,
            documento_tipo_destino: destino,
            documento_ids: [plantillaId],
            mes: hoy.getMonth() + 1,
            anio: hoy.getFullYear(),
          })
          .pipe(
            tap((res) => {
              this.generating = false;
              if (res.generados === 0) {
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
