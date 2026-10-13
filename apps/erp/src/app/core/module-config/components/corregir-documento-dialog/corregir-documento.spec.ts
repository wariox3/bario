import {
  aCabeceraCorregible,
  aLineaCorregible,
  cambiosCabecera,
  cambiosLinea,
  payloadContabilidad,
  type LineaCorregible,
} from './corregir-documento';

const LINEA_ITEM = aLineaCorregible({
  id: 1,
  tipo_registro: 'I',
  item_nombre: 'Servicio',
  cantidad: '2.000000',
  precio: '1000.000000',
  subtotal: '2000.000000',
  base: '0.000000',
  centro_costo: 5,
  centro_costo_nombre: 'Administración',
  contacto: null,
});

const LINEA_CUENTA = aLineaCorregible({
  id: 2,
  tipo_registro: 'C',
  cuenta_codigo: '236540',
  cuenta_nombre: 'Retención',
  base: '1000.000000',
  centro_costo: null,
  contacto: 9,
  contacto_numero_identificacion: '900123',
  contacto_nombre_corto: 'Proveedor SAS',
});

describe('aLineaCorregible', () => {
  it('describe la línea de ítem por su ítem y normaliza los montos', () => {
    expect(LINEA_ITEM).toMatchObject({
      esCuenta: false,
      descripcion: 'Servicio',
      cantidad: 2,
      precio: 1000,
      subtotal: 2000,
      centroCosto: { id: 5, nombre: 'Administración' },
      contacto: null,
    });
  });

  it('describe la línea de cuenta por código y nombre, con su contacto etiquetado', () => {
    expect(LINEA_CUENTA).toMatchObject({
      esCuenta: true,
      descripcion: '236540 Retención',
      base: 1000,
      contacto: { id: 9, nombre: '900123 - Proveedor SAS' },
    });
  });
});

describe('aCabeceraCorregible', () => {
  it('arma la sede con su nombre', () => {
    expect(aCabeceraCorregible({ sede: 3, sede_nombre: 'Principal' })).toEqual({
      sede: { id: 3, nombre: 'Principal' },
    });
  });

  it('deja vacío lo que no vino', () => {
    expect(aCabeceraCorregible({})).toEqual({ sede: null });
  });
});

describe('cambiosCabecera', () => {
  const original = aCabeceraCorregible({ sede: 3 });

  it('no manda nada si nada cambió, aunque cambie la etiqueta', () => {
    expect(cambiosCabecera(original, { ...original, sede: { id: 3, nombre: 'Otra' } })).toBeNull();
  });

  it('manda la sede que cambió', () => {
    expect(cambiosCabecera(original, { sede: { id: 4, nombre: 'Norte' } })).toEqual({ sede: 4 });
  });

  it('manda null al quitar la sede', () => {
    expect(cambiosCabecera(original, { sede: null })).toEqual({ sede: null });
  });
});

describe('cambiosLinea', () => {
  it('no manda nada si la línea no cambió', () => {
    expect(cambiosLinea(LINEA_CUENTA, LINEA_CUENTA)).toBeNull();
  });

  it('manda el centro de costo en cualquier línea', () => {
    const actual: LineaCorregible = { ...LINEA_ITEM, centroCosto: null };
    expect(cambiosLinea(LINEA_ITEM, actual)).toEqual({ centro_costo: null });
  });

  it('manda base y contacto de una línea de cuenta', () => {
    const actual: LineaCorregible = {
      ...LINEA_CUENTA,
      base: 1500,
      contacto: { id: 10, nombre: 'Otro' },
    };
    expect(cambiosLinea(LINEA_CUENTA, actual)).toEqual({ base: 1500, contacto: 10 });
  });

  it('ignora base y contacto en una línea de ítem', () => {
    const actual: LineaCorregible = { ...LINEA_ITEM, base: 50, contacto: { id: 1, nombre: 'x' } };
    expect(cambiosLinea(LINEA_ITEM, actual)).toBeNull();
  });
});

describe('payloadContabilidad', () => {
  const cabecera = aCabeceraCorregible({ sede: 3 });
  const original = {
    cabecera,
    lineas: new Map([
      [LINEA_ITEM.id, LINEA_ITEM],
      [LINEA_CUENTA.id, LINEA_CUENTA],
    ]),
  };

  it('no arma nada si nada cambió', () => {
    expect(
      payloadContabilidad(5054, original, { cabecera, lineas: [LINEA_ITEM, LINEA_CUENTA] }),
    ).toBeNull();
  });

  it('manda la sede y solo las líneas tocadas, con sus claves cambiadas', () => {
    expect(
      payloadContabilidad(5054, original, {
        cabecera: { sede: { id: 4, nombre: 'Norte' } },
        lineas: [{ ...LINEA_ITEM, centroCosto: { id: 12, nombre: 'Ventas' } }, LINEA_CUENTA],
      }),
    ).toEqual({ id: 5054, sede: 4, detalles: [{ id: 1, centro_costo: 12 }] });
  });

  it('sin cambio de sede manda solo los detalles', () => {
    expect(
      payloadContabilidad(5054, original, {
        cabecera,
        lineas: [{ ...LINEA_ITEM, centroCosto: null }, LINEA_CUENTA],
      }),
    ).toEqual({ id: 5054, detalles: [{ id: 1, centro_costo: null }] });
  });
});
