import { Injectable, inject } from '@angular/core';
import { EMPTY, from, type Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { DOCUMENT_TYPE_ID, extractErrorMessage, I18nService, ToastService } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { DialogService } from 'primeng/dynamicdialog';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarDocumentoService } from './generar-documento.service';

/**
 * Acción "generar": abre un modal con un selector de mes/año y genera un documento
 * de **pedido servicio** (destino) a partir de los **contratos servicio** (origen)
 * del mes/año elegido.
 *
 * Origen y destino son constantes del requerimiento de negocio (no se derivan del
 * documento anfitrión): origen `CONTRATO_SERVICIO` (34) → destino
 * `PEDIDO_SERVICIO` (35). Si mañana la acción se reusa en otros documentos con
 * distinto destino, se promueve a un campo tipado del `DocumentEntityConfig`.
 */
@Injectable()
export class GenerarDocumentoActionStrategy implements EntityActionStrategy {
  readonly id = 'generar';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generar.buttonLabel',
    iconClass: 'pi pi-bolt',
  };

  private readonly dialog = inject(DialogService);
  private readonly api = inject(GenerarDocumentoService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  execute(ctx: EntityActionContext): Observable<void> {
    const dict = this.i18n.t().documentActions.generar;

    // El modal se carga lazy: mantiene el datepicker fuera del bundle inicial
    // (el strategy se provee eager en root). Mismo patrón para futuras acciones.
    return from(import('./generar-documento-modal.component')).pipe(
      switchMap(({ GenerarDocumentoModalComponent }) => {
        // Frame compartido (`ENTITY_ACTION_DIALOG_DEFAULTS`): chrome consistente
        // del ERP. El modal dibuja su propio header/footer (showHeader: false).
        const ref = this.dialog.open(GenerarDocumentoModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '27rem',
        });
        return ref ? ref.onClose : EMPTY;
      }),
      // El modal cierra con `null` al cancelar: solo seguimos con un período real.
      filter((periodo: unknown): periodo is Date => periodo instanceof Date),
      switchMap((periodo) =>
        this.api
          .generar({
            documento_tipo_id: DOCUMENT_TYPE_ID.CONTRATO_SERVICIO,
            documento_tipo_id_destino: DOCUMENT_TYPE_ID.PEDIDO_SERVICIO,
            mes: periodo.getMonth() + 1,
            anio: periodo.getFullYear(),
          })
          .pipe(
            tap(() => {
              this.toast.success(dict.success.title, dict.success.desc);
              ctx.reload();
            }),
            catchError((err: unknown) => {
              this.toast.error(dict.error.title, extractErrorMessage(err, dict.error.desc));
              return EMPTY;
            }),
          ),
      ),
      map(() => void 0),
    );
  }
}
