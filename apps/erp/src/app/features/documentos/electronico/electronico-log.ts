import type { ElectronicoCorreo, ElectronicoEvento, ElectronicoLog } from './electronico-log.model';

/** Cómo se lee un evento: avanzó la entrega, la frenó, o no dice ninguna de las dos. */
export type EventoTono = 'positivo' | 'negativo' | 'neutro';

/** Un envío con sus eventos ya ordenados del más viejo al más nuevo: su ruta de entrega. */
export interface EnvioRuta {
  readonly id: string;
  readonly correo: string;
  readonly copia: string | null;
  readonly fecha: string | null;
  readonly eventos: readonly ElectronicoEvento[];
}

const POSITIVOS: ReadonlySet<string> = new Set(['entregado', 'abierto', 'abierto_primera', 'clic']);

const NEGATIVOS: ReadonlySet<string> = new Set([
  'rebote_suave',
  'rebote_duro',
  'rebote',
  'correo_invalido',
  'invalido',
  'bloqueado',
  'queja',
  'spam',
  'error',
]);

export function eventoTono(evento: string): EventoTono {
  if (POSITIVOS.has(evento)) return 'positivo';
  if (NEGATIVOS.has(evento)) return 'negativo';
  return 'neutro';
}

/** `epoca` ordena aunque dos eventos caigan en el mismo segundo; `fecha` es el respaldo. */
function instante(evento: ElectronicoEvento): number {
  const epoca = Number(evento.epoca);
  return Number.isFinite(epoca) && epoca > 0 ? epoca : new Date(evento.fecha).getTime();
}

/**
 * Agrupa los eventos bajo su correo (`idMensaje` ↔ `codigoCorreoPk`), del envío
 * más reciente al más viejo. Un evento cuyo correo no vino en la lista no se
 * pierde: arma su propio envío con los datos que trae él mismo.
 */
export function armarRutas(log: ElectronicoLog): readonly EnvioRuta[] {
  const porMensaje = new Map<string, ElectronicoEvento[]>();
  for (const evento of log.eventos) {
    const lista = porMensaje.get(evento.idMensaje) ?? [];
    lista.push(evento);
    porMensaje.set(evento.idMensaje, lista);
  }

  const ordenar = (eventos: readonly ElectronicoEvento[] = []): readonly ElectronicoEvento[] =>
    [...eventos].sort((a, b) => instante(a) - instante(b));

  const rutas: EnvioRuta[] = log.correos.map((correo: ElectronicoCorreo) => ({
    id: correo.codigoCorreoPk,
    correo: correo.correo,
    copia: correo.correoCopia,
    fecha: correo.fecha,
    eventos: ordenar(porMensaje.get(correo.codigoCorreoPk)),
  }));

  const conocidos = new Set(log.correos.map((c) => c.codigoCorreoPk));
  for (const [idMensaje, eventos] of porMensaje) {
    if (conocidos.has(idMensaje)) continue;
    rutas.push({
      id: idMensaje,
      correo: eventos[0].correo,
      copia: null,
      fecha: eventos[0].correoFecha,
      eventos: ordenar(eventos),
    });
  }

  const fechaDe = (ruta: EnvioRuta): number => (ruta.fecha ? new Date(ruta.fecha).getTime() : 0);
  return rutas.sort((a, b) => fechaDe(b) - fechaDe(a));
}

/**
 * Texto de una validación DIAN. Aún no se ha visto una con datos: si llega un
 * texto se muestra tal cual; si llega un objeto, sus valores no vacíos en orden.
 */
export function validacionTexto(validacion: unknown): string {
  if (typeof validacion === 'string') return validacion;
  if (validacion && typeof validacion === 'object') {
    return Object.values(validacion)
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map(String)
      .join(' · ');
  }
  return String(validacion ?? '');
}
