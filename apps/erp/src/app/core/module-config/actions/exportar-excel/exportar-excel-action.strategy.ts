import { Injectable, inject } from '@angular/core';
import { EMPTY, type Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ENTITY_DATA_GATEWAY, I18nService, ToastService } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';

/**
 * Acción "Exportar excel": descarga directa (sin modal). Delega en el gateway
 * (`exportExcel`), que reusa el mismo armado de filtros que la lista — así el
 * Excel respeta el `documento_tipo_id`, los `defaultFilters` y los filtros/orden
 * activos del usuario. Genérica: cualquier documento la activa vía `extraActionIds`.
 */
@Injectable()
export class ExportarExcelActionStrategy implements EntityActionStrategy {
  readonly id = 'export-excel';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'common.actions.exportExcel',
    iconClass: 'pi pi-file-excel',
  };

  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita disparar dos descargas si se clickea repetido antes de terminar. */
  private exporting = false;

  execute(ctx: EntityActionContext): Observable<void> {
    if (this.exporting) return EMPTY;
    this.exporting = true;
    const errorToast = this.i18n.t().common.toasts.exportError;

    return this.gateway.exportExcel(ctx.document, ctx.query).pipe(
      catchError(() => {
        this.toast.error(errorToast.title, errorToast.desc);
        return EMPTY;
      }),
      finalize(() => {
        this.exporting = false;
      }),
    );
  }
}
