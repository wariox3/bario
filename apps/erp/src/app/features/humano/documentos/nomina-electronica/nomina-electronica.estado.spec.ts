import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  type ContextoNominaElectronica,
} from './nomina-electronica.estado';

const SIN_APROBAR: ContextoNominaElectronica = {
  estado_aprobado: false,
  estado_anulado: false,
  estado_contabilizado: false,
  estado_electronico_enviado: false,
};
const APROBADA: ContextoNominaElectronica = { ...SIN_APROBAR, estado_aprobado: true };
const EMITIDA: ContextoNominaElectronica = { ...APROBADA, estado_electronico_enviado: true };
const CONTABILIZADA: ContextoNominaElectronica = { ...APROBADA, estado_contabilizado: true };
const ANULADA: ContextoNominaElectronica = { ...APROBADA, estado_anulado: true };

// El eje de aprobación (aprobar, desaprobar, anular) se testea en
// `documento.estado.spec.ts`. Acá solo lo propio de este documento: emitir.

describe('capacidadesDe — emitir', () => {
  it('no se emite lo que no está aprobado', () => {
    expect(capacidadesDe(SIN_APROBAR).puedeEmitir).toBe(false);
  });

  it('se emite una nómina aprobada', () => {
    expect(capacidadesDe(APROBADA).puedeEmitir).toBe(true);
  });

  it('es de un solo uso: emitida ya no se vuelve a emitir', () => {
    expect(capacidadesDe(EMITIDA).puedeEmitir).toBe(false);
  });

  it('no se emite una nómina anulada', () => {
    expect(capacidadesDe(ANULADA).puedeEmitir).toBe(false);
  });

  it('contabilizar no impide emitir: son ejes distintos', () => {
    expect(capacidadesDe(CONTABILIZADA).puedeEmitir).toBe(true);
  });
});

describe('capacidadesDe — hereda el eje de aprobación', () => {
  it('trae las tres capacidades de la base junto a la propia', () => {
    expect(capacidadesDe(APROBADA)).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: true,
      puedeAnular: true,
      puedeEmitir: true,
    });
  });
});

describe('CAPACIDADES_VACIAS', () => {
  it('no ofrece nada mientras la cabecera no cargó', () => {
    expect(CAPACIDADES_VACIAS).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
      puedeEmitir: false,
    });
  });
});
