import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DocumentEntityConfig, ListQuery } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import { ImprimirListaBaseStrategy } from './imprimir-lista-base.strategy';

/** Acción "Imprimir zip": un ZIP con un PDF por cada documento del listado. */
@Injectable()
export class ImprimirZipActionStrategy extends ImprimirListaBaseStrategy {
  readonly id = 'imprimir-zip';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.imprimirLista.zipLabel',
    iconClass: 'pi pi-box',
  };

  protected descargar(document: DocumentEntityConfig, query: ListQuery): Observable<void> {
    return this.gateway.imprimirZip(document, query);
  }
}
