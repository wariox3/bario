import type {
  ElectronicoCorreo,
  ElectronicoEvento,
  ElectronicoLog,
  ElectronicoValidacion,
} from './electronico-log.model';

/** Cómo se lee un evento: avanzó la entrega, la frenó, o no dice ninguna de las dos. */
export type EventoTono = 'positivo' | 'negativo' | 'neutro';

/** Etapas por las que pasa todo correo; cada una es una columna del modal. */
export type Etapa = 'enviado' | 'entregado' | 'abierto';
export const ETAPAS: readonly Etapa[] = ['enviado', 'entregado', 'abierto'];

/** Primera vez que el destinatario alcanzó una etapa, y cuántas veces se repitió. */
export interface Hito {
  readonly fecha: string;
  readonly veces: number;
}

/** Cómo quedó un destinatario: la etapa más avanzada o, si llegó después, el rebote. */
export interface EstadoDestinatario {
  readonly evento: string;
  readonly tono: EventoTono;
  readonly motivo: string | null;
}

export interface DestinatarioEnvio {
  readonly correo: string;
  /** Recibió el envío en copia (lo normal: la propia empresa). */
  readonly copia: boolean;
  readonly hitos: Readonly<Record<Etapa, Hito | null>>;
  /** `null` si el proveedor de correo aún no reporta nada de este destinatario. */
  readonly estado: EstadoDestinatario | null;
}

/** Un envío del documento con su estado por destinatario. */
export interface EnvioDestinatarios {
  readonly id: string;
  readonly fecha: string | null;
  readonly destinatarios: readonly DestinatarioEnvio[];
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

/** Un clic en el enlace implica que lo abrió: cuenta para esa etapa. */
const ETAPA_DE: Readonly<Record<string, Etapa>> = {
  enviado: 'enviado',
  entregado: 'entregado',
  abierto: 'abierto',
  abierto_primera: 'abierto',
  clic: 'abierto',
};

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

const clave = (correo: string): string => correo.trim().toLowerCase();

/** `correoCopia` puede traer varias direcciones separadas por coma o punto y coma. */
function separarCorreos(valor: string | null): string[] {
  return (valor ?? '')
    .split(/[,;]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** Hitos y estado de un destinatario a partir de sus eventos ya ordenados. */
function resumirDestinatario(
  correo: string,
  copia: boolean,
  eventos: readonly ElectronicoEvento[],
): DestinatarioEnvio {
  const hitos: Record<Etapa, Hito | null> = { enviado: null, entregado: null, abierto: null };
  let avance: ElectronicoEvento | null = null;
  let rebote: ElectronicoEvento | null = null;
  for (const evento of eventos) {
    const etapa = ETAPA_DE[evento.evento];
    if (etapa) {
      const hito = hitos[etapa];
      hitos[etapa] = hito ? { ...hito, veces: hito.veces + 1 } : { fecha: evento.fecha, veces: 1 };
      if (!avance || ETAPAS.indexOf(etapa) >= ETAPAS.indexOf(ETAPA_DE[avance.evento])) {
        avance = evento;
      }
    } else if (NEGATIVOS.has(evento.evento)) {
      rebote = evento;
    }
  }

  // Un rebote manda si es posterior al último avance (un rebote temporal que luego
  // se entregó ya no es el estado); un evento desconocido solo si no hay nada más.
  const ultimo = eventos.at(-1) ?? null;
  const vigente =
    rebote && (!avance || instante(rebote) > instante(avance)) ? rebote : (avance ?? ultimo);

  return {
    correo,
    copia,
    hitos,
    estado: vigente
      ? { evento: vigente.evento, tono: eventoTono(vigente.evento), motivo: vigente.motivo }
      : null,
  };
}

/**
 * Agrupa los eventos bajo su envío (`idMensaje` ↔ `codigoCorreoPk`) y, dentro de
 * él, bajo su destinatario (`evento.correo`): el cliente y la copia reciben el
 * mismo mensaje pero cada uno tiene su propio recorrido. Envíos del más reciente
 * al más viejo; el destinatario principal primero. Un evento cuyo envío o
 * destinatario no vino en la lista no se pierde: arma su propia fila.
 */
export function armarEnvios(log: ElectronicoLog): readonly EnvioDestinatarios[] {
  const porMensaje = new Map<string, ElectronicoEvento[]>();
  for (const evento of log.eventos) {
    const lista = porMensaje.get(evento.idMensaje) ?? [];
    lista.push(evento);
    porMensaje.set(evento.idMensaje, lista);
  }

  const armar = (
    id: string,
    fecha: string | null,
    declarados: readonly { correo: string; copia: boolean }[],
  ): EnvioDestinatarios => {
    const eventos = [...(porMensaje.get(id) ?? [])].sort((a, b) => instante(a) - instante(b));
    const filas = [...declarados];
    const vistos = new Set(filas.map((f) => clave(f.correo)));
    for (const evento of eventos) {
      if (vistos.has(clave(evento.correo))) continue;
      vistos.add(clave(evento.correo));
      filas.push({ correo: evento.correo, copia: false });
    }
    return {
      id,
      fecha,
      destinatarios: filas.map((f) =>
        resumirDestinatario(
          f.correo,
          f.copia,
          eventos.filter((e) => clave(e.correo) === clave(f.correo)),
        ),
      ),
    };
  };

  const envios: EnvioDestinatarios[] = log.correos.map((correo: ElectronicoCorreo) =>
    armar(correo.codigoCorreoPk, correo.fecha, [
      { correo: correo.correo, copia: false },
      ...separarCorreos(correo.correoCopia).map((c) => ({ correo: c, copia: true })),
    ]),
  );

  const conocidos = new Set(log.correos.map((c) => c.codigoCorreoPk));
  for (const [idMensaje, eventos] of porMensaje) {
    if (conocidos.has(idMensaje)) continue;
    envios.push(armar(idMensaje, eventos[0].correoFecha, []));
  }

  const fechaDe = (envio: EnvioDestinatarios): number =>
    envio.fecha ? new Date(envio.fecha).getTime() : 0;
  return envios.sort((a, b) => fechaDe(b) - fechaDe(a));
}

/** Una fila de la vista detallada: un evento tal cual lo reportó el proveedor. */
export interface EventoFila {
  readonly id: number;
  readonly fecha: string;
  readonly correo: string;
  readonly copia: boolean;
  readonly evento: string;
  readonly tono: EventoTono;
  readonly motivo: string | null;
  readonly ip: string | null;
  /** Número del envío al que pertenece, el mismo del separador del resumen. */
  readonly envio: number;
}

/**
 * Todos los eventos en una sola lista, del más reciente al más viejo, para la
 * vista detallada. Copia y número de envío salen de `armarEnvios`, así ambas
 * vistas cuentan lo mismo.
 */
export function listarEventos(log: ElectronicoLog): readonly EventoFila[] {
  const envios = armarEnvios(log);
  const numeroDe = new Map(envios.map((e, i) => [e.id, envios.length - i]));
  const copiaDe = new Map(
    envios.map((e) => [
      e.id,
      new Set(e.destinatarios.filter((d) => d.copia).map((d) => clave(d.correo))),
    ]),
  );
  return [...log.eventos]
    .sort((a, b) => instante(b) - instante(a))
    .map((evento) => ({
      id: evento.codigoEventoPk,
      fecha: evento.fecha,
      correo: evento.correo,
      copia: copiaDe.get(evento.idMensaje)?.has(clave(evento.correo)) ?? false,
      evento: evento.evento,
      tono: eventoTono(evento.evento),
      motivo: evento.motivo,
      ip: evento.ipEnvio ?? null,
      envio: numeroDe.get(evento.idMensaje) ?? 0,
    }));
}

/** Validaciones de la más reciente a la más vieja; las que no traen texto no dicen nada. */
export function ordenarValidaciones(
  validaciones: readonly ElectronicoValidacion[],
): readonly ElectronicoValidacion[] {
  const fechaDe = (v: ElectronicoValidacion): number => (v.fecha ? new Date(v.fecha).getTime() : 0);
  return validaciones
    .filter((v) => (v.descripcion ?? '').trim().length > 0)
    .sort((a, b) => fechaDe(b) - fechaDe(a));
}
