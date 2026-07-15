import type { DocumentoEstados } from '@reddoc/core';
import { deriveEstadoBadges, type EstadoLabels } from './document-estados.utils';

const LABELS: EstadoLabels = {
  aprobado: 'Aprobado',
  contabilizado: 'Contabilizado',
  electronico: 'Electrónico',
  enviadoDian: 'Enviado DIAN (esperando respuesta)',
  notificado: 'Notificado',
  generado: 'Generado',
  anulado: 'Anulado',
};

/** Base con todo apagado; cada test enciende solo lo que le interesa. */
const OFF: DocumentoEstados = { estado_aprobado: false };

describe('deriveEstadoBadges', () => {
  it('sin banderas activas devuelve una lista vacía', () => {
    expect(deriveEstadoBadges(OFF, LABELS)).toEqual([]);
  });

  it('aprobado + contabilizado devuelve dos badges positivos en orden de ciclo', () => {
    const badges = deriveEstadoBadges(
      { ...OFF, estado_aprobado: true, estado_contabilizado: true },
      LABELS,
    );
    expect(badges).toEqual([
      { key: 'aprobado', label: 'Aprobado', severity: 'positive' },
      { key: 'contabilizado', label: 'Contabilizado', severity: 'positive' },
    ]);
  });

  it('enviado a la DIAN sin aceptación electrónica muestra el badge pendiente', () => {
    const badges = deriveEstadoBadges(
      { ...OFF, estado_electronico: false, estado_electronico_enviado: true },
      LABELS,
    );
    expect(badges).toEqual([
      { key: 'enviadoDian', label: 'Enviado DIAN (esperando respuesta)', severity: 'pending' },
    ]);
  });

  it('con electrónico aceptado pinta "Electrónico" y no el pendiente, aunque esté enviado', () => {
    const badges = deriveEstadoBadges(
      { ...OFF, estado_electronico: true, estado_electronico_enviado: true },
      LABELS,
    );
    expect(badges).toEqual([{ key: 'electronico', label: 'Electrónico', severity: 'positive' }]);
  });

  it('anulado devuelve un badge destructivo', () => {
    const badges = deriveEstadoBadges({ ...OFF, estado_anulado: true }, LABELS);
    expect(badges).toEqual([{ key: 'anulado', label: 'Anulado', severity: 'danger' }]);
  });

  it('mantiene el orden fijo generado → aprobado → contabilizado → electrónico → notificado → anulado', () => {
    const badges = deriveEstadoBadges(
      {
        estado_generado: true,
        estado_aprobado: true,
        estado_contabilizado: true,
        estado_electronico: true,
        estado_electronico_notificado: true,
        estado_anulado: true,
      },
      LABELS,
    );
    expect(badges.map((b) => b.key)).toEqual([
      'generado',
      'aprobado',
      'contabilizado',
      'electronico',
      'notificado',
      'anulado',
    ]);
  });
});
