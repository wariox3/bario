import type { Observable } from 'rxjs';
import type { RowAction } from '@reddoc/feature-base';
import type { DocumentoRecibido, RadianEstado } from './documento-recibido.model';
import type { DocumentoRecibidoService } from './documento-recibido.service';
import type { EventoRadianCodigo } from './evento-radian.model';

const I18N = 'entities.documentoRecibido.acciones';

/** Acciones de negocio sobre un documento recibido. */
export type AccionRecepcionId =
  | 'acuse'
  | 'recibo'
  | 'aceptar'
  | 'reclamar'
  | 'descartar'
  | 'restaurar'
  | 'eliminar';

/**
 * Una acción sobre un documento recibido, declarada una sola vez: cuándo se
 * ofrece y qué hace. La lista (y mañana la ficha) la pintan desde aquí, así que
 * sumar un caso es sumar una entrada, no un `@if` por pantalla.
 *
 * `habilitada` solo esconde lo imposible: plazos, fechas y demás los valida el
 * backend, que responde 400 con su mensaje.
 */
interface AccionBase {
  readonly id: AccionRecepcionId;
  readonly iconClass: string;
  readonly severity?: 'default' | 'danger';
  readonly habilitada: (doc: DocumentoRecibido) => boolean;
}

/** Se ejecuta de una (con o sin confirmación) llamando al servicio. */
export interface AccionDirecta extends AccionBase {
  readonly tipo: 'directa';
  /** Si `true`, pide confirmación antes de ejecutar. */
  readonly confirmar: boolean;
  readonly ejecutar: (
    service: DocumentoRecibidoService,
    doc: DocumentoRecibido,
  ) => Observable<unknown>;
}

/** Registra un evento RADIAN: abre el diálogo con el formulario de su código. */
export interface AccionEvento extends AccionBase {
  readonly tipo: 'evento';
  readonly codigo: EventoRadianCodigo;
}

export type AccionRecepcion = AccionDirecta | AccionEvento;

/**
 * Qué evento admite cada estado RADIAN: 030 → 032 → (033 o 031). Aceptar y
 * reclamar se excluyen y cierran el proceso. Si la DIAN cambia el orden, se
 * toca este mapa y nada más.
 */
const EVENTOS_SIGUIENTES: Record<RadianEstado, readonly EventoRadianCodigo[]> = {
  sin_eventos: ['030'],
  acuse: ['032'],
  recibo: ['033', '031'],
  aceptada: [],
  reclamada: [],
};

/**
 * ¿Admite el documento este evento ahora? Un descartado no admite ninguno.
 * Supuesto: `estado_recepcion` en `true` es una recepción terminada (por ejemplo,
 * una factura de contado verificada), que tampoco admite más.
 *
 * Mismo hueco que `sinEventos`: mientras el evento anterior está pendiente,
 * `radian_estado` no se mueve y el mismo evento se vuelve a ofrecer.
 */
function admiteEvento(doc: DocumentoRecibido, codigo: EventoRadianCodigo): boolean {
  return (
    !doc.estado_descartado &&
    !doc.estado_recepcion &&
    EVENTOS_SIGUIENTES[doc.radian_estado].includes(codigo)
  );
}

function accionEvento(
  id: AccionRecepcionId,
  codigo: EventoRadianCodigo,
  iconClass: string,
): AccionEvento {
  return {
    id,
    tipo: 'evento',
    codigo,
    iconClass,
    habilitada: (doc) => admiteEvento(doc, codigo),
  };
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
  accionEvento('acuse', '030', 'pi pi-inbox'),
  accionEvento('recibo', '032', 'pi pi-box'),
  accionEvento('aceptar', '033', 'pi pi-check-circle'),
  accionEvento('reclamar', '031', 'pi pi-exclamation-circle'),
  {
    id: 'descartar',
    tipo: 'directa',
    iconClass: 'pi pi-ban',
    confirmar: true,
    // El backend lo rechaza si ya está descartado, si su recepción terminó o si tiene eventos.
    habilitada: (doc) => !doc.estado_descartado && !doc.estado_recepcion && sinEventos(doc),
    ejecutar: (service, doc) => service.descartar(doc.id),
  },
  {
    id: 'restaurar',
    tipo: 'directa',
    iconClass: 'pi pi-replay',
    // Deshace un descarte: no destruye nada, así que no pide confirmar.
    confirmar: false,
    habilitada: (doc) => doc.estado_descartado,
    ejecutar: (service, doc) => service.restaurar(doc.id),
  },
  {
    id: 'eliminar',
    tipo: 'directa',
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
