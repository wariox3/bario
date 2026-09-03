import { Injectable } from '@angular/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { GenerarDocumentoModalTexts } from '../generar/generar-documento-modal.component';
import type { EntityActionContext } from '../entity-action-strategy';
import { GenerarRecurrenteBaseStrategy } from './generar-recurrente-base.strategy';

/**
 * Acción "Generar seleccionados": genera facturas reales a partir de las
 * **plantillas recurrentes** marcadas (checkbox) en el listado.
 *
 * Opera sobre `ctx.selectedIds`. Sin selección, avisa y no hace HTTP. El resto
 * del flujo —destino, modal de período, POST, toasts, reload— lo aporta
 * `GenerarRecurrenteBaseStrategy`. Va dentro del dropdown "Acciones"
 * (`placement` default): es la variante quirúrgica, no la de rutina.
 *
 * Ver su hermana `GenerarRecurrenteTodosActionStrategy` para la variante que
 * genera desde todas las plantillas del tipo.
 */
@Injectable()
export class GenerarRecurrenteSeleccionadosActionStrategy extends GenerarRecurrenteBaseStrategy {
  readonly id = 'generar-recurrente-seleccionados';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generarRecurrente.seleccionadosLabel',
    iconClass: 'pi pi-bolt',
  };

  protected override modalTexts(): GenerarDocumentoModalTexts {
    const dict = this.dict;
    return {
      modalHeader: dict.modalHeader,
      modalSubtitle: dict.modalSubtitle,
      periodoLabel: dict.periodoLabel,
      submit: dict.submit,
      cancel: dict.cancel,
    };
  }

  protected override resolveScope(ctx: EntityActionContext): readonly number[] | null {
    if (ctx.selectedIds.length === 0) {
      this.toast.warn(this.dict.noSelection.title, this.dict.noSelection.desc);
      return null;
    }
    return ctx.selectedIds.map((id) => Number(id));
  }
}
