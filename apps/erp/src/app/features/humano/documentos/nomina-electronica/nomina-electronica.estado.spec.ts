import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  type ContextoNominaElectronica,
} from './nomina-electronica.estado';

const SIN_APROBAR: ContextoNominaElectronica = {
  estado_aprobado: false,
  estado_anulado: false,
  estado_electronico_enviado: false,
};
const APROBADA: ContextoNominaElectronica = { ...SIN_APROBAR, estado_aprobado: true };
const EMITIDA: ContextoNominaElectronica = { ...APROBADA, estado_electronico_enviado: true };
const ANULADA: ContextoNominaElectronica = { ...APROBADA, estado_anulado: true };

describe('capacidadesDe — sin aprobar', () => {
  it('solo ofrece aprobar', () => {
    const c = capacidadesDe(SIN_APROBAR);
    expect(c.puedeAprobar).toBe(true);
    expect(c.puedeDesaprobar).toBe(false);
    expect(c.puedeAnular).toBe(false);
    expect(c.puedeEmitir).toBe(false);
  });

  it('no deja emitir a la DIAN algo que nadie aprobó', () => {
    expect(capacidadesDe(SIN_APROBAR).puedeEmitir).toBe(false);
  });
});

describe('capacidadesDe — aprobada', () => {
  it('abre las tres acciones del tramo posterior', () => {
    const c = capacidadesDe(APROBADA);
    expect(c.puedeDesaprobar).toBe(true);
    expect(c.puedeAnular).toBe(true);
    expect(c.puedeEmitir).toBe(true);
  });

  it('no ofrece volver a aprobar', () => {
    expect(capacidadesDe(APROBADA).puedeAprobar).toBe(false);
  });
});

describe('capacidadesDe — emitida', () => {
  it('cierra emitir: enviar dos veces el mismo documento no es idempotente', () => {
    expect(capacidadesDe(EMITIDA).puedeEmitir).toBe(false);
  });

  it('deja desaprobar y anular, como en el ERP anterior', () => {
    const c = capacidadesDe(EMITIDA);
    expect(c.puedeDesaprobar).toBe(true);
    expect(c.puedeAnular).toBe(true);
  });
});

describe('capacidadesDe — anulada', () => {
  it('congela el documento: ninguna accion queda disponible', () => {
    expect(capacidadesDe(ANULADA)).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
      puedeEmitir: false,
    });
  });

  it('gana sobre las otras banderas', () => {
    // Anulada y sin aprobar tampoco habilita aprobar, que es lo unico que
    // ofreceria si solo se mirara `estado_aprobado`.
    const anuladaSinAprobar: ContextoNominaElectronica = { ...ANULADA, estado_aprobado: false };
    expect(capacidadesDe(anuladaSinAprobar).puedeAprobar).toBe(false);
  });
});

describe('CAPACIDADES_VACIAS', () => {
  it('no habilita nada mientras la cabecera carga', () => {
    expect(Object.values(CAPACIDADES_VACIAS).every((v) => v === false)).toBe(true);
  });
});
