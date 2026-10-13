import { facturaVentaToFormValue, formValueToPayload } from './factura-venta.mapper';
import type { FacturaVentaRead } from './factura-venta.model';
import type { FacturaVentaFormRawValue } from './factura-venta-form.types';

describe('factura de venta · almacén general', () => {
  it('lee el almacén como opción con su nombre', () => {
    const read = { almacen: 4, almacen_nombre: 'Principal' } as FacturaVentaRead;
    expect(facturaVentaToFormValue(read).almacen).toEqual({ id: 4, nombre: 'Principal' });
  });

  it('sin almacén queda vacío', () => {
    const read = { almacen: null } as FacturaVentaRead;
    expect(facturaVentaToFormValue(read).almacen).toBeNull();
  });

  it('manda solo el id del almacén', () => {
    const raw = {
      almacen: { id: 4, nombre: 'Principal' },
      detalles: [],
      pagos: [],
    } as unknown as FacturaVentaFormRawValue;
    expect(formValueToPayload(raw, 1, false).almacen).toBe(4);
  });
});
