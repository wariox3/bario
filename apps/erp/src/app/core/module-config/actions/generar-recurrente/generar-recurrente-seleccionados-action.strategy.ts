import { Injectable, inject } from '@angular/core';
import { EMPTY, type Observable } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { extractErrorMessage, I18nService, ToastService } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarRecurrenteService } from './generar-recurrente.service';

/**
 * Acción "Generar seleccionados": genera facturas reales a partir de las
 * **plantillas recurrentes** seleccionadas (checkbox) en el listado.
 *
 * Opera sobre `ctx.selectedIds` (los ids marcados). Sin selección, avisa y no
 * hace HTTP. Al terminar recarga la lista para reflejar el estado.
 *
 * La variante "Generar todos" (sobre el filtro completo) queda pendiente para
 * una v2 —requiere confirmar el contrato del backend—; por eso esta acción es
 * explícitamente "seleccionados".
 */
@Injectable()
export class GenerarRecurrenteSeleccionadosActionStrategy implements EntityActionStrategy {
  readonly id = 'generar-recurrente-seleccionados';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generarRecurrente.seleccionadosLabel',
    iconClass: 'pi pi-bolt',
  };

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
    if (this.generating) return EMPTY;
    this.generating = true;

    return this.api.generar(ctx.selectedIds).pipe(
      tap((res) => {
        this.generating = false;
        if (res.documentos_creados.length === 0) {
          this.toast.info(dict.empty.title, dict.empty.desc);
          return;
        }
        this.toast.success(dict.success.title, dict.success.desc);
        ctx.reload();
      }),
      map(() => void 0),
      catchError((err: unknown) => {
        this.generating = false;
        this.toast.error(dict.error.title, extractErrorMessage(err, dict.error.desc));
        return EMPTY;
      }),
    );
  }
}
