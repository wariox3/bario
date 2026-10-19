import type { Observable } from 'rxjs';
import type { RowAction } from '@reddoc/feature-base';
import type { DocumentoRecibido } from './documento-recibido.model';
import type { DocumentoRecibidoService } from './documento-recibido.service';

const I18N = 'entities.documentoRecibido.acciones';

/** Acciones de negocio sobre un documento recibido. */
export type AccionRecepcionId = 'descartar' | 'eliminar';

/**
 * Una acción sobre un documento recibido, declarada una sola vez: cuándo se
 * ofrece, si pide confirmar y qué llama. La lista (y mañana la ficha) la pintan
 * desde aquí, así que sumar un caso es sumar una entrada, no un `@if` por
 * pantalla.
 *
 * `habilitada` solo esconde lo imposible: plazos, orden de eventos y demás los
 * valida el backend, que responde 400 con su mensaje (lo muestra el
 * interceptor).
 */
export interface AccionRecepcion {
  readonly id: AccionRecepcionId;
  readonly iconClass: string;
  readonly severity?: 'default' | 'danger';
  /** Si `true`, pide confirmación antes de ejecutar. */
  readonly confirmar: boolean;
  readonly habilitada: (doc: DocumentoRecibido) => boolean;
  readonly ejecutar: (
    service: DocumentoRecibidoService,
    doc: DocumentoRecibido,
  ) => Observable<unknown>;
}

/**
 * ¿El documento está libre de eventos RADIAN? Descartar y eliminar lo exigen.
 *
 * `radian_estado` solo cambia cuando la DIAN **registra** un evento: uno
 * pendiente o rechazado lo deja en `sin_eventos` y el backend igual responde
 * 400. Se usa mientras el documento no traiga un `tiene_eventos`.
 */
function sinEventos(doc: DocumentoRecibido): boolean {
  return doc.radian_estado === 'sin_eventos';
}

export const ACCIONES_RECEPCION: readonly AccionRecepcion[] = [
  {
    id: 'descartar',
    iconClass: 'pi pi-ban',
    confirmar: true,
    // El backend lo rechaza si ya está descartado, si su recepción terminó o si tiene eventos.
    habilitada: (doc) => !doc.estado_descartado && !doc.estado_recepcion && sinEventos(doc),
    ejecutar: (service, doc) => service.descartar(doc.id),
  },
  {
    id: 'eliminar',
    iconClass: 'pi pi-trash',
    severity: 'danger',
    confirmar: true,
    // Borra el documento y sus archivos; con cualquier evento, 400.
    habilitada: sinEventos,
    ejecutar: (service, doc) => service.eliminar(doc.id),
  },
];

export function buscarAccionRecepcion(id: string): AccionRecepcion | undefined {
  return ACCIONES_RECEPCION.find((accion) => accion.id === id);
}

/** Las acciones como acciones de fila de `<lib-data-table>` (van al menú ⋮). */
export const ACCIONES_RECEPCION_ROW: readonly RowAction[] = ACCIONES_RECEPCION.map((accion) => ({
  id: accion.id,
  labelKey: `${I18N}.${accion.id}.label`,
  iconClass: accion.iconClass,
  severity: accion.severity,
  visibleFor: (row: unknown) => accion.habilitada(row as DocumentoRecibido),
}));
