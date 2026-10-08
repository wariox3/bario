import { MODELO, PERMISSION_ROUTE_DATA_KEY } from '@erp/core/permissions';
import {
  rutaAlmacenes,
  rutaAsesores,
  rutaContactos,
  rutaCuentasBanco,
  rutaFormasPago,
  rutaItems,
  rutaPrecios,
  rutaResoluciones,
  rutaSedes,
} from './masters-compartidos.routes';

/** Cada fábrica con el modelo que le toca. `null` = sin modelo en el backend. */
const FABRICAS = [
  { nombre: 'contactos', rutas: rutaContactos(), modelo: MODELO.general.contacto },
  { nombre: 'items', rutas: rutaItems(), modelo: MODELO.general.item },
  { nombre: 'cuentas-banco', rutas: rutaCuentasBanco(), modelo: MODELO.general.cuentaBanco },
  { nombre: 'precios', rutas: rutaPrecios(), modelo: MODELO.general.precio },
  { nombre: 'asesores', rutas: rutaAsesores(), modelo: MODELO.general.asesor },
  { nombre: 'sedes', rutas: rutaSedes(), modelo: MODELO.general.sede },
  { nombre: 'formas-pago', rutas: rutaFormasPago(), modelo: MODELO.general.formaPago },
  {
    nombre: 'resoluciones',
    rutas: rutaResoluciones({ tipo: 'venta' }),
    modelo: MODELO.general.resolucion,
  },
  { nombre: 'almacenes', rutas: rutaAlmacenes(), modelo: null },
] as const;

describe('masters compartidos', () => {
  it.each(FABRICAS)('$nombre declara su modelo y su gemela', ({ rutas, modelo }) => {
    const [real] = rutas;
    expect(real.data?.[PERMISSION_ROUTE_DATA_KEY]).toBe(modelo ?? undefined);

    // `withPermission` devuelve el par (real + gemela de acceso denegado); un
    // master sin modelo es una ruta sola. Si esto cambia, el `...` de los
    // módulos deja de tener sentido.
    expect(rutas).toHaveLength(modelo === null ? 1 : 2);
  });

  it('resoluciones conserva el `data` del módulo que la enruta', () => {
    const [real] = rutaResoluciones({ tipo: 'compra' });
    expect(real.data?.['tipo']).toBe('compra');
  });
});
