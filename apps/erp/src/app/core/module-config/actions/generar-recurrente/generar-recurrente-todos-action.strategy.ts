import { Injectable } from '@angular/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { GenerarDocumentoModalTexts } from '../generar/generar-documento-modal.component';
import { GenerarRecurrenteBaseStrategy } from './generar-recurrente-base.strategy';

/**
 * Acción "Generar todos": genera las facturas del período a partir de **todas**
 * las plantillas recurrentes del tipo, sin necesidad de seleccionar filas.
 *
 * Es la rutina de fin de mes del listado recurrente —el equivalente al "Generar
 * todos" del ERP legacy—, por eso va como **botón suelto** (`placement:
 * 'button'`) a la izquierda del dropdown "Acciones" en vez de escondida dentro.
 *
 * Dos cosas que el modal explicita antes de confirmar, porque el backend las
 * impone y no son obvias:
 *  - El período (mes/año) es requerido: no se asume el mes actual.
 *  - `POST general/documento/generar/` **no acepta filtros**. "Todos" son todas
 *    las plantillas del tipo, no las que se estén viendo filtradas — de ahí el
 *    `warning` del modal.
 *
 * El alcance se expresa **omitiendo** `documento_ids` (ver la base): mandarlo
 * vacío sería una selección vacía, otra cosa.
 */
@Injectable()
export class GenerarRecurrenteTodosActionStrategy extends GenerarRecurrenteBaseStrategy {
  readonly id = 'generar-recurrente-todos';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.generarRecurrente.todosLabel',
    iconClass: 'pi pi-bolt',
  };

  override readonly placement = 'button' as const;

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
