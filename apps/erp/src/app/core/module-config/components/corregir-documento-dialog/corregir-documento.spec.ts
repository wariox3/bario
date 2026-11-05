import {
  aCabeceraCorregible,
  aLineaCorregible,
  cambiosCabecera,
  cambiosLinea,
  corrigeCampo,
  exigidosFaltantes,
  payloadContabilidad,
  rechazoCorreccion,
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

/** Línea de cuenta cuya cuenta exige base y contacto: los dos se corrigen. */
const LINEA_CUENTA_EXIGE = aLineaCorregible({
  id: 6,
  tipo_registro: 'C',
  cuenta_codigo: '236540',
  base: '1000.000000',
  centro_costo: 7,
  centro_costo_nombre: 'Ventas',
  contacto: 9,
  cuenta_exige_base: true,
  cuenta_exige_contacto: true,
});

const LINEA_EXIGE_CC = aLineaCorregible({
  id: 3,
  tipo_registro: 'C',
  cuenta_codigo: '519595',
  centro_costo: 5,
  centro_costo_nombre: 'Administración',
  cuenta_exige_centro_costo: true,
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

  it('manda base y contacto de una línea de cuenta que los exige', () => {
    const actual: LineaCorregible = {
      ...LINEA_CUENTA_EXIGE,
      base: 1500,
      contacto: { id: 10, nombre: 'Otro' },
    };
    expect(cambiosLinea(LINEA_CUENTA_EXIGE, actual)).toEqual({ base: 1500, contacto: 10 });
  });

  it('no manda el centro de costo si no cambió', () => {
    expect(cambiosLinea(LINEA_CUENTA_EXIGE, { ...LINEA_CUENTA_EXIGE, base: 2000 })).toEqual({
      base: 2000,
    });
  });

  it('ignora base y contacto si la cuenta no los exige: el backend los rechaza', () => {
    const actual: LineaCorregible = {
      ...LINEA_CUENTA,
      base: 1500,
      contacto: { id: 10, nombre: 'Otro' },
    };
    expect(cambiosLinea(LINEA_CUENTA, actual)).toBeNull();
  });

  it('ignora base y contacto en una línea de ítem', () => {
    const actual: LineaCorregible = { ...LINEA_ITEM, base: 50, contacto: { id: 1, nombre: 'x' } };
    expect(cambiosLinea(LINEA_ITEM, actual)).toBeNull();
  });
});

describe('corrigeCampo', () => {
  it('solo deja corregir base y contacto en la línea de cuenta que los exige', () => {
    expect(corrigeCampo(LINEA_CUENTA_EXIGE, 'base')).toBe(true);
    expect(corrigeCampo(LINEA_CUENTA_EXIGE, 'contacto')).toBe(true);
    expect(corrigeCampo(LINEA_CUENTA, 'base')).toBe(false);
    expect(corrigeCampo(LINEA_CUENTA, 'contacto')).toBe(false);
    expect(corrigeCampo({ ...LINEA_ITEM, exige: LINEA_CUENTA_EXIGE.exige }, 'base')).toBe(false);
  });
});

describe('rechazoCorreccion', () => {
  const enviados = [{ id: 67 }, { id: 68 }];
  const http = (error: unknown) => ({ status: 400, error });

  it('lee el motivo general y el de cada línea por su id', () => {
    const rechazo = rechazoCorreccion(
      http({
        detail: 'Hay detalles que no se pueden corregir.',
        errores: [{ indice: 0, id: 67, mensaje: 'La cuenta 130505 no exige base.' }],
      }),
      enviados,
    );
    expect(rechazo?.detail).toBe('Hay detalles que no se pueden corregir.');
    expect([...(rechazo?.porLinea ?? [])]).toEqual([[67, 'La cuenta 130505 no exige base.']]);
  });

  it('sin id ubica la línea por su índice en lo enviado', () => {
    const rechazo = rechazoCorreccion(
      http({ errores: [{ indice: 1, mensaje: 'No pertenece al documento.' }] }),
      enviados,
    );
    expect(rechazo?.detail).toBeNull();
    expect([...(rechazo?.porLinea ?? [])]).toEqual([[68, 'No pertenece al documento.']]);
  });

  it('devuelve null si la respuesta no trae errores por línea', () => {
    expect(rechazoCorreccion(http({ detail: 'Documento anulado.' }), enviados)).toBeNull();
    expect(rechazoCorreccion({ status: 0, error: null }, enviados)).toBeNull();
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

describe('exigidosFaltantes', () => {
  /** Línea de la cuenta 520530 que exige las tres cosas, con todo completo. */
  const CESANTIAS = aLineaCorregible({
    id: 4,
    tipo_registro: 'C',
    cuenta_codigo: '520530',
    base: '1000.000000',
    centro_costo: 5,
    contacto: 9,
    cuenta_exige_centro_costo: true,
    cuenta_exige_base: true,
    cuenta_exige_contacto: true,
  });

  it('lee las exigencias de la cuenta y las da por falsas si no vienen', () => {
    expect(LINEA_EXIGE_CC.exige).toEqual({ centroCosto: true, base: false, contacto: false });
    expect(LINEA_CUENTA.exige).toEqual({ centroCosto: false, base: false, contacto: false });
  });

  it('no marca nada si todo lo exigido está completo', () => {
    expect(exigidosFaltantes([LINEA_ITEM, LINEA_CUENTA, LINEA_EXIGE_CC, CESANTIAS]).size).toBe(0);
  });

  it('marca cada campo exigido que quedó vacío, con la base en cero como vacía', () => {
    const vacia = { ...CESANTIAS, centroCosto: null, base: 0, contacto: null };
    expect([...(exigidosFaltantes([vacia]).get(4) ?? [])]).toEqual([
      'centroCosto',
      'base',
      'contacto',
    ]);
  });

  it('deja vaciar lo que la cuenta no exige', () => {
    const lineas = [{ ...LINEA_CUENTA, base: 0, contacto: null }, LINEA_ITEM];
    expect(exigidosFaltantes(lineas).size).toBe(0);
  });

  it('marca también la línea que ya venía sin el centro de costo, aunque nadie la tocara', () => {
    const sinCc = aLineaCorregible({
      id: 2,
      tipo_registro: 'C',
      cuenta_codigo: '520530',
      centro_costo: null,
      cuenta_exige_centro_costo: true,
    });
    expect([...exigidosFaltantes([sinCc]).keys()]).toEqual([2]);
  });
});
