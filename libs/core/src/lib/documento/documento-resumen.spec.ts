import {
  cantidadDesdeCabecera,
  cuentasDesdeCabecera,
  resumenDesdeCabecera,
} from './documento-resumen';
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

/**
 * Factura de compra 154: un ítem de 10.000 sin impuestos y una cuenta débito de
 * 10.000. `subtotal` y `total` ya suman la cuenta; `total_bruto` no.
 */
const factura154: DocumentoTotalesRead = {
  subtotal: '20000.000000',
  descuento: '0.000000',
  total_bruto: '10000.000000',
  base_impuesto: '10000.000000',
  impuesto: '0.000000',
  impuesto_retencion: '0.000000',
  total: '20000.000000',
  debito: '10000.000000',
  credito: '0.000000',
  documento_impuestos: [],
};

describe('resumenDesdeCabecera', () => {
  it('sin cuentas cuadra con el total del backend', () => {
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

  it('deja afuera las cuentas aunque subtotal y total las sumen', () => {
    expect(resumenDesdeCabecera(factura154)).toEqual({
      subtotal: 10000,
      descuento: 0,
      impuestos: [],
      total: 10000,
    });
  });

  it('con descuento, retención y una cuenta crédito el desglose cuadra', () => {
    // Ítems: 1000 − 100 de descuento + 171 de IVA − 22,5 de retención = 1048,5.
    // Cuenta crédito de 48,5: el documento queda en 1000.
    const r = resumenDesdeCabecera({
      ...factura131,
      subtotal: '951.50',
      descuento: '100.00',
      total: '1000.00',
      debito: '0.00',
      credito: '48.50',
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
    expect(r).toEqual({
      subtotal: 1000,
      descuento: 100,
      impuestos: [
        { id: 3, nombre: 'IVA Compras 19%', total: 171 },
        { id: 7, nombre: 'RTF', total: -22.5 },
      ],
      total: 1048.5,
    });
  });

  it('sin desglose por impuesto devuelve null', () => {
    expect(resumenDesdeCabecera({ ...factura131, documento_impuestos: undefined })).toBeNull();
  });
});

describe('cuentasDesdeCabecera', () => {
  it('lee débitos y créditos de la cabecera', () => {
    expect(cuentasDesdeCabecera(factura154)).toEqual({ debitos: 10000, creditos: 0 });
  });

  it('sin los campos devuelve null para que se sumen las líneas', () => {
    expect(cuentasDesdeCabecera(factura131)).toBeNull();
  });
});

describe('cantidadDesdeCabecera', () => {
  it('lee la suma de cantidades, con decimales', () => {
    expect(cantidadDesdeCabecera({ ...factura154, cantidad_detalles: '12.500000' })).toBe(12.5);
  });

  it('sin el campo devuelve null: no se puede paginar sin perder el total', () => {
    expect(cantidadDesdeCabecera(factura154)).toBeNull();
  });
});
