import { FormArray } from '@angular/forms';
import {
  createComercialDetalleGroup,
  propagarCentroCostoALineasComerciales,
  type ComercialDetalleGroup,
} from './comercial-documento-detalle.form';

const ADMINISTRACION = { id: 8, nombre: 'Administración' };
const VENTAS = { id: 9, nombre: 'Ventas' };

/**
 * El centro de costo de la línea comercial, como el «grupo» del ERP anterior:
 * la línea nueva nace con el de la cabecera y la persona corrige la excepción.
 */
describe('línea comercial · centro de costo', () => {
  it('la línea nueva toma el de la cabecera', () => {
    const group = createComercialDetalleGroup(undefined, null, ADMINISTRACION);
    expect(group.controls.centro_costo.value).toEqual(ADMINISTRACION);
  });

  it('la línea que ya trae el suyo lo conserva', () => {
    const group = createComercialDetalleGroup({ centro_costo: VENTAS }, null, ADMINISTRACION);
    expect(group.controls.centro_costo.value).toEqual(VENTAS);
  });

  it('cambiar la cabecera lo replica solo en las líneas sin guardar', () => {
    const nueva = createComercialDetalleGroup(undefined, null, ADMINISTRACION);
    const importada = createComercialDetalleGroup(
      { documento_detalle_afectado: 40, centro_costo: ADMINISTRACION },
      null,
    );
    const guardada = createComercialDetalleGroup({ id: 5, centro_costo: ADMINISTRACION });
    const detalles = new FormArray<ComercialDetalleGroup>([nueva, importada, guardada]);

    propagarCentroCostoALineasComerciales(detalles, VENTAS);

    expect(nueva.controls.centro_costo.value).toEqual(VENTAS);
    expect(importada.controls.centro_costo.value).toEqual(VENTAS);
    expect(guardada.controls.centro_costo.value).toEqual(ADMINISTRACION);
  });
});
