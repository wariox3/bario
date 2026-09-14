import type { DocumentoEstados } from '@reddoc/core';
import {
  CAPACIDADES_DOCUMENTO_VACIAS,
  capacidadesDocumento,
  puedeAnularPagosDocumento,
} from './documento.estado';

const SIN_APROBAR: DocumentoEstados = {
  estado_aprobado: false,
  estado_anulado: false,
  estado_contabilizado: false,
  estado_electronico_enviado: false,
};
const APROBADO: DocumentoEstados = { ...SIN_APROBAR, estado_aprobado: true };
const CONTABILIZADO: DocumentoEstados = { ...APROBADO, estado_contabilizado: true };
const ENVIADO: DocumentoEstados = { ...APROBADO, estado_electronico_enviado: true };
const ANULADO: DocumentoEstados = { ...APROBADO, estado_anulado: true };

describe('capacidadesDocumento — sin aprobar', () => {
  it('solo ofrece aprobar', () => {
    expect(capacidadesDocumento(SIN_APROBAR)).toEqual({
      puedeAprobar: true,
      puedeDesaprobar: false,
      puedeAnular: false,
    });
  });
});

describe('capacidadesDocumento — aprobado', () => {
  it('abre desaprobar y anular, y cierra aprobar', () => {
    expect(capacidadesDocumento(APROBADO)).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: true,
      puedeAnular: true,
    });
  });
});

describe('capacidadesDocumento — contabilizado', () => {
  it('cierra desaprobar: habría que revertir el asiento contable', () => {
    expect(capacidadesDocumento(CONTABILIZADO).puedeDesaprobar).toBe(false);
  });

  it('deja anular: anular no revierte, cierra', () => {
    expect(capacidadesDocumento(CONTABILIZADO).puedeAnular).toBe(true);
  });
});

describe('capacidadesDocumento — enviado a la DIAN', () => {
  it('cierra anular', () => {
    expect(capacidadesDocumento(ENVIADO).puedeAnular).toBe(false);
  });

  it('deja desaprobar, como en el ERP anterior', () => {
    expect(capacidadesDocumento(ENVIADO).puedeDesaprobar).toBe(true);
  });
});

describe('capacidadesDocumento — anulado', () => {
  it('congela el documento: ninguna accion queda disponible', () => {
    expect(capacidadesDocumento(ANULADO)).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
    });
  });

  it('no vuelve a ofrecer aprobar, a diferencia del ERP anterior', () => {
    expect(
      capacidadesDocumento({ estado_aprobado: false, estado_anulado: true }).puedeAprobar,
    ).toBe(false);
  });
});

describe('capacidadesDocumento — banderas ausentes', () => {
  it('trata la bandera que no vino como "no": un read con solo aprobado abre las tres', () => {
    expect(capacidadesDocumento({ estado_aprobado: true })).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: true,
      puedeAnular: true,
    });
  });
});

describe('CAPACIDADES_DOCUMENTO_VACIAS', () => {
  it('no ofrece nada mientras la cabecera no cargó', () => {
    expect(CAPACIDADES_DOCUMENTO_VACIAS).toEqual({
      puedeAprobar: false,
      puedeDesaprobar: false,
      puedeAnular: false,
    });
  });
});

describe('puedeAnularPagosDocumento', () => {
  it('sin aprobar no: el pago se elimina desde el formulario', () => {
    expect(puedeAnularPagosDocumento(SIN_APROBAR)).toBe(false);
  });

  it('aprobado y sin contabilizar sí', () => {
    expect(puedeAnularPagosDocumento(APROBADO)).toBe(true);
  });

  it('contabilizado no: el pago ya está en la contabilidad', () => {
    expect(puedeAnularPagosDocumento(CONTABILIZADO)).toBe(false);
  });

  it('anulado no: el documento quedó congelado', () => {
    expect(puedeAnularPagosDocumento(ANULADO)).toBe(false);
  });

  it('una bandera ausente cuenta como "no" (conservador)', () => {
    expect(puedeAnularPagosDocumento({})).toBe(false);
  });
});
