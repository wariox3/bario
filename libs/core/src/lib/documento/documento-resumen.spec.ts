import { resumenDesdeCabecera } from './documento-resumen';
import type { DocumentoImpuestoAgrupadoRead, DocumentoTotalesRead } from './documento.types';

const iva19: DocumentoImpuestoAgrupadoRead = {
  impuesto_id: 3,
  impuesto_nombre: 'IVA 19%',
  impuesto_nombre_extendido: 'IVA Compras 19%',
  impuesto_operacion: 1,
  base: '1621500.000000',
  total: '308085.000000',
  total_operado: '0.000000',
};

/** Acumulados reales de la factura de compra 131 (`documento/131/detalle/`). */
const factura131: DocumentoTotalesRead = {
  subtotal: '1686500.000000',
  descuento: '0.000000',
  total_bruto: '1686500.000000',
  base_impuesto: '1686500.000000',
  impuesto: '310585.000000',
  impuesto_retencion: '0.000000',
  total: '1997085.000000',
  documento_impuestos: [
    iva19,
    {
      impuesto_id: 4,
      impuesto_nombre: 'IVA 5%',
      impuesto_nombre_extendido: 'IVA Compras 5%',
      impuesto_operacion: 1,
      base: '50000.000000',
      total: '2500.000000',
      total_operado: '0.000000',
    },
  ],
};

describe('resumenDesdeCabecera', () => {
  it('arma el resumen con los acumulados y cuadra con el total del backend', () => {
    expect(resumenDesdeCabecera(factura131)).toEqual({
      subtotal: 1686500,
      descuento: 0,
      impuestos: [
        { id: 3, nombre: 'IVA Compras 19%', total: 308085 },
        { id: 4, nombre: 'IVA Compras 5%', total: 2500 },
      ],
      total: 1997085,
    });
  });

  it('resta el descuento y las retenciones', () => {
    const r = resumenDesdeCabecera({
      ...factura131,
      subtotal: '1000.00',
      descuento: '100.00',
      documento_impuestos: [
        { ...iva19, total: '171.00' },
        {
          impuesto_id: 7,
          impuesto_nombre: 'RTF',
          impuesto_nombre_extendido: '',
          impuesto_operacion: -1,
          base: '900.00',
          total: '22.50',
          total_operado: '-22.50',
        },
      ],
    });
    expect(r?.impuestos.map((imp) => imp.total)).toEqual([171, -22.5]);
    expect(r?.total).toBe(1048.5);
  });

  it('sin desglose por impuesto devuelve null', () => {
    expect(resumenDesdeCabecera({ ...factura131, documento_impuestos: undefined })).toBeNull();
  });
});
