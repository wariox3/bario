import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DocumentEntityConfig, ListQuery } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import { ImprimirListaBaseStrategy } from './imprimir-lista-base.strategy';

/** Acción "Imprimir": un solo PDF con los documentos del listado. */
@Injectable()
export class ImprimirListaActionStrategy extends ImprimirListaBaseStrategy {
  readonly id = 'imprimir';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.imprimirLista.label',
    iconClass: 'pi pi-print',
  };

  protected descargar(document: DocumentEntityConfig, query: ListQuery): Observable<void> {
    return this.gateway.imprimirLista(document, query);
  }
}
