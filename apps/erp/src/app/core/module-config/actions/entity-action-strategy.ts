import type { Observable } from 'rxjs';
import { type DocumentEntityConfig, type ListQuery } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';

/**
 * Contexto que el listado anfitrión (`BaseDocumentListComponent`) entrega a un
 * `EntityActionStrategy` al ejecutarse.
 *
 * Es lo único que el strategy puede saber del listado (ISP): el config del
 * documento activo y cómo pedir un reload tras un cambio. NO expone el
 * componente, su template ni su estado interno.
 */
export interface EntityActionContext {
  /** Config del documento activo (de aquí salen `documentTypeId`, `endpoint`, etc.). */
  readonly document: DocumentEntityConfig;
  /**
   * Query activo del listado (filtros, orden y paginación actuales). Útil para
   * acciones que operan sobre lo que el usuario está viendo (ej. exportar).
   */
  readonly query: ListQuery;
  /**
   * Ids de las filas seleccionadas (checkbox) al momento de disparar la acción.
   * Vacío si no hay selección. Lo consumen las acciones masivas (ej. generar
   * seleccionados); las que operan sobre el query completo pueden ignorarlo.
   */
  readonly selectedIds: readonly (string | number)[];
  /** Recarga la lista. El strategy lo llama tras una operación exitosa. */
  readonly reload: () => void;
}

/**
 * Acción extra de toolbar de un documento, **auto-contenida** y Open/Closed.
 *
 * Cada acción (generar, anular, contabilizar, …) implementa esta interfaz como
 * un `@Injectable` y se registra en el multi-provider `ENTITY_ACTION_STRATEGY`.
 * El `BaseDocumentListComponent` solo conoce este contrato: filtra los strategies
 * por `document.extraActionIds`, los mapea a botones del toolbar y delega la
 * ejecución. No conoce el modal, el endpoint ni el payload de ninguna acción.
 *
 * Agregar una acción nueva = crear su strategy (+ su modal y servicio propios) y
 * registrarla en una línea; ni el componente base ni el toolbar se modifican.
 */
export interface EntityActionStrategy {
  /** Identificador estable; debe coincidir con un string de `document.extraActionIds`. */
  readonly id: string;

  /**
   * Descriptor que el componente base añade a `trailingActions` del toolbar.
   * Su `id` debe ser igual a `this.id` para que el dispatch por id sea directo.
   */
  readonly toolbarAction: ToolbarAction;

  /**
   * Filtro fino opcional, además de `extraActionIds`. Default: disponible.
   * Permite ocultar la acción según condiciones de runtime del documento.
   */
  isAvailable?(document: DocumentEntityConfig): boolean;

  /**
   * Ejecuta la acción end-to-end: abre su propio modal, hace su HTTP, muestra el
   * toast y al terminar llama `ctx.reload()`. Devuelve un `Observable<void>` que
   * completa al cerrarse el flujo; el componente base solo se suscribe con
   * `takeUntilDestroyed` para gestionar el ciclo de vida.
   */
  execute(ctx: EntityActionContext): Observable<void>;
}
