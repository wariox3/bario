import { Injectable } from '@angular/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { GenerarDocumentoModalTexts } from '../generar/generar-documento-modal.component';
import { GenerarRecurrenteBaseStrategy } from './generar-recurrente-base.strategy';

/**
 * Acción "Generar todos": genera las facturas del período a partir de **todas**
 * las plantillas recurrentes del tipo, sin necesidad de seleccionar filas.
 *
 * Es la rutina de fin de mes del listado recurrente —el equivalente al "Generar
 * todos" del ERP legacy—, y vive dentro del dropdown "Acciones" (`placement`
 * default `'menu'`, heredado de la base) junto a "Generar seleccionados": las
 * dos variantes de lo mismo se leen juntas y el toolbar queda corto.
 *
 * Dos cosas que el modal explicita antes de confirmar, porque el backend las
 * impone y no son obvias:
 *  - El período (mes/año) es requerido: no se asume el mes actual.
 *  - `POST general/documento/generar-recurrente/` **no acepta filtros**. "Todos"
 *    son todas las plantillas del tipo, no las que se estén viendo filtradas —
 *    de ahí el `warning` del modal.
 *
 * El alcance se expresa mandando `documento_ids` vacío (ver la base): quien
 * delimita la generación es el tipo de origen, y los ids solo la acotarían.
 */
@Injectable()
export class GenerarRecurrenteTodosActionStrategy extends GenerarRecurrenteBaseStrategy {
  readonly id = 'generar-recurrente-todos';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generarRecurrente.todosLabel',
    iconClass: 'pi pi-bolt',
  };

  protected override modalTexts(): GenerarDocumentoModalTexts {
    const dict = this.dict;
    return {
      modalHeader: dict.todosModalHeader,
      modalSubtitle: dict.todosModalSubtitle,
      warning: dict.todosWarning,
      periodoLabel: dict.periodoLabel,
      submit: dict.submit,
      cancel: dict.cancel,
    };
  }

  /** Sin selección de por medio: siempre "todas las del tipo". */
  protected override resolveScope(): 'todos' {
    return 'todos';
  }

  protected override emptyDesc(): string {
    return this.dict.empty.descTodos;
  }
}
