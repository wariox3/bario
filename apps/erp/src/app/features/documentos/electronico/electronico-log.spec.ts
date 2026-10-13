import { armarEnvios, eventoTono, listarEventos, ordenarValidaciones } from './electronico-log';
import type { ElectronicoEvento, ElectronicoLog } from './electronico-log.model';

const MENSAJE = '<202610132025.78574800807@smtp-relay.mailin.fr>';
const CLIENTE = 'maestradaz3@gmail.com';
const COPIA = 'investigacion@semantica.com.co';

const evento = (
  pk: number,
  nombre: string,
  correo: string,
  epoca: string,
  opts: { idMensaje?: string; fecha?: string; motivo?: string } = {},
): ElectronicoEvento => ({
  codigoEventoPk: pk,
  evento: nombre,
  correo,
  fecha: opts.fecha ?? new Date(Number(epoca)).toISOString(),
  idMensaje: opts.idMensaje ?? MENSAJE,
  motivo: opts.motivo ?? null,
  epoca,
  correoFecha: '2026-10-13T15:25:17-05:00',
});

/** La respuesta real de SETP990000001: el cliente no lo abrió, la copia sí. */
const LOG_REAL: ElectronicoLog = {
  correos: [
    {
      codigoCorreoPk: MENSAJE,
      fecha: '2026-10-13T15:25:17-05:00',
      numeroDocumento: 'SETP990000001',
      correo: CLIENTE,
      correoCopia: COPIA,
    },
  ],
  eventos: [
    evento(5773978, 'entregado', CLIENTE, '1791923118000'),
    evento(5773977, 'enviado', CLIENTE, '1791923117636'),
    evento(5774017, 'abierto_primera', COPIA, '1791923324209'),
    evento(5773981, 'entregado', COPIA, '1791923120000'),
    evento(5773979, 'enviado', COPIA, '1791923117775'),
  ],
  validaciones: [],
};

describe('log electrónico · envíos por destinatario', () => {
  it('separa al cliente de la copia: la apertura de la copia no es del cliente', () => {
    const [envio] = armarEnvios(LOG_REAL);
    const [cliente, copia] = envio.destinatarios;

    expect(cliente).toMatchObject({ correo: CLIENTE, copia: false });
    expect(cliente.estado?.evento).toBe('entregado');
    expect(cliente.hitos.abierto).toBeNull();

    expect(copia).toMatchObject({ correo: COPIA, copia: true });
    expect(copia.estado).toEqual({ evento: 'abierto_primera', tono: 'positivo', motivo: null });
    expect(copia.hitos.abierto).toEqual({ fecha: expect.any(String), veces: 1 });
  });

  it('cuenta las repeticiones de una etapa y guarda la primera vez', () => {
    const log: ElectronicoLog = {
      ...LOG_REAL,
      eventos: [
        evento(1, 'abierto', CLIENTE, '1791923500000'),
        evento(2, 'abierto_primera', CLIENTE, '1791923400000'),
        evento(3, 'clic', CLIENTE, '1791923600000'),
      ],
    };
    const cliente = armarEnvios(log)[0].destinatarios[0];
    expect(cliente.hitos.abierto).toEqual({
      fecha: new Date(1791923400000).toISOString(),
      veces: 3,
    });
  });

  it('un rebote posterior manda sobre el avance, con su motivo', () => {
    const log: ElectronicoLog = {
      ...LOG_REAL,
      eventos: [
        evento(1, 'enviado', CLIENTE, '1791923117000'),
        evento(2, 'rebote_duro', CLIENTE, '1791923118000', { motivo: 'Buzón inexistente' }),
      ],
    };
    expect(armarEnvios(log)[0].destinatarios[0].estado).toEqual({
      evento: 'rebote_duro',
      tono: 'negativo',
      motivo: 'Buzón inexistente',
    });
  });

  it('un rebote temporal que luego se entregó ya no es el estado', () => {
    const log: ElectronicoLog = {
      ...LOG_REAL,
      eventos: [
        evento(1, 'rebote_suave', CLIENTE, '1791923117000'),
        evento(2, 'entregado', CLIENTE, '1791923118000'),
      ],
    };
    expect(armarEnvios(log)[0].destinatarios[0].estado?.evento).toBe('entregado');
  });

  it('deja sin estado al destinatario sin reportes y no pierde eventos huérfanos', () => {
    const log: ElectronicoLog = {
      ...LOG_REAL,
      eventos: [evento(1, 'entregado', 'otro@correo.com', '1791923118000', { idMensaje: '<x>' })],
    };
    const [real, huerfano] = armarEnvios(log);
    expect(real.destinatarios.map((d) => d.estado)).toEqual([null, null]);
    expect(huerfano.id).toBe('<x>');
    expect(huerfano.destinatarios[0].correo).toBe('otro@correo.com');
  });

  it('pone primero el envío más reciente', () => {
    const log: ElectronicoLog = {
      ...LOG_REAL,
      correos: [
        { ...LOG_REAL.correos[0], codigoCorreoPk: '<viejo>', fecha: '2026-10-11T20:28:17-05:00' },
        { ...LOG_REAL.correos[0], codigoCorreoPk: '<nuevo>', fecha: '2026-10-13T15:25:17-05:00' },
      ],
      eventos: [],
    };
    expect(armarEnvios(log).map((e) => e.id)).toEqual(['<nuevo>', '<viejo>']);
  });
});

describe('log electrónico · vista detallada', () => {
  it('lista todos los eventos del más reciente, con su copia y su envío', () => {
    const filas = listarEventos(LOG_REAL);
    expect(filas.map((f) => f.evento)).toEqual([
      'abierto_primera',
      'entregado',
      'entregado',
      'enviado',
      'enviado',
    ]);
    expect(filas[0]).toMatchObject({ correo: COPIA, copia: true, tono: 'positivo', envio: 1 });
    expect(filas[2]).toMatchObject({ correo: CLIENTE, copia: false });
  });
});

describe('log electrónico · tono y validaciones', () => {
  it('distingue avance, rebote y lo desconocido', () => {
    expect(eventoTono('entregado')).toBe('positivo');
    expect(eventoTono('rebote_duro')).toBe('negativo');
    expect(eventoTono('algo_nuevo')).toBe('neutro');
  });

  it('ordena las validaciones de la más reciente y descarta las vacías', () => {
    const validacion = (pk: number, fecha: string, descripcion: string | null) => ({
      codigoValidacionPk: pk,
      fecha,
      descripcion,
    });
    const ordenadas = ordenarValidaciones([
      validacion(1, '2026-10-12T09:00:00-05:00', 'Vieja'),
      validacion(2, '2026-10-13T09:42:17-05:00', 'El correo cliente@dominio.com esta bloqueado'),
      validacion(3, '2026-10-13T10:00:00-05:00', '  '),
    ]);
    expect(ordenadas.map((v) => v.codigoValidacionPk)).toEqual([2, 1]);
  });
});
