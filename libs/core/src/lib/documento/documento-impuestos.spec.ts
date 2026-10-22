import { impuestosAgrupadosToResumen } from './documento-impuestos';
import type { DocumentoImpuestoAgrupadoRead } from './documento.types';

const iva: DocumentoImpuestoAgrupadoRead = {
  impuesto_id: 1,
  impuesto_nombre: 'IVA',
  impuesto_nombre_extendido: 'IVA 19% compras',
  impuesto_operacion: 1,
  base: '1000000.000000',
  total: '190000.000000',
  total_operado: '190000.000000',
};

const retencion: DocumentoImpuestoAgrupadoRead = {
  impuesto_id: 7,
  impuesto_nombre: 'RTF',
  impuesto_nombre_extendido: 'Retención compras 2.5%',
  impuesto_operacion: -1,
  base: '1000000.000000',
  total: '25000.000000',
  total_operado: '-25000.000000',
};

describe('impuestosAgrupadosToResumen', () => {
  it('toma el monto con signo y el nombre extendido', () => {
    expect(impuestosAgrupadosToResumen([iva, retencion])).toEqual([
      { id: 1, nombre: 'IVA 19% compras', total: 190000 },
      { id: 7, nombre: 'Retención compras 2.5%', total: -25000 },
    ]);
  });

  it('saca el signo de la operación aunque total_operado llegue en cero', () => {
    const [imp, ret] = impuestosAgrupadosToResumen([
      { ...iva, total_operado: '0.000000' },
      { ...retencion, total_operado: '0.000000' },
    ]);
    expect(imp.total).toBe(190000);
    expect(ret.total).toBe(-25000);
  });

  it('cae al nombre corto si el extendido viene vacío', () => {
    const [imp] = impuestosAgrupadosToResumen([{ ...iva, impuesto_nombre_extendido: '' }]);
    expect(imp.nombre).toBe('IVA');
  });
});
