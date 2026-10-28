import { depreciacionLineaToView, sumarLineasDepreciacion } from './depreciacion-linea.mapper';
import type { DepreciacionLineaView } from './depreciacion-linea.model';

function linea(valor: number): DepreciacionLineaView {
  return { id: null, activo: 1, codigo: 'A-1', nombre: 'Computador', dias: 30, valor };
}

describe('depreciacionLineaToView', () => {
  it('toma el valor de `precio`, no de `total` (que el backend deja en 0)', () => {
    // `total` no está en el tipo, pero el backend lo manda así.
    const read = {
      id: 4,
      item: null,
      activo: 9,
      activo_codigo: 'VEH-01',
      activo_nombre: 'Camioneta',
      dias: 30,
      cantidad: '0.000000',
      precio: '416666.670000',
      total: '0.000000',
    };
    const view = depreciacionLineaToView(read);

    expect(view).toEqual({
      id: 4,
      activo: 9,
      codigo: 'VEH-01',
      nombre: 'Camioneta',
      dias: 30,
      valor: 416666.67,
    });
  });

  it('sin datos del activo deja vacíos el código y el nombre, y en 0 días y valor', () => {
    expect(depreciacionLineaToView({ id: 4, item: null, cantidad: null, precio: null })).toEqual({
      id: 4,
      activo: null,
      codigo: '',
      nombre: '',
      dias: 0,
      valor: 0,
    });
  });
});

describe('sumarLineasDepreciacion', () => {
  it('suma el valor de las líneas', () => {
    expect(sumarLineasDepreciacion([linea(416666.67), linea(83333.33)])).toBe(500000);
  });

  it('redondea una sola vez al final', () => {
    // 3 × 0,004 = 0,012 → 0,01. Redondeando cada línea daría 0.
    expect(sumarLineasDepreciacion([linea(0.004), linea(0.004), linea(0.004)])).toBe(0.01);
  });

  it('sin residuo de coma flotante: 0,1 + 0,2 da 0,3', () => {
    expect(sumarLineasDepreciacion([linea(0.1), linea(0.2)])).toBe(0.3);
  });

  it('sin líneas da 0', () => {
    expect(sumarLineasDepreciacion([])).toBe(0);
  });
});
