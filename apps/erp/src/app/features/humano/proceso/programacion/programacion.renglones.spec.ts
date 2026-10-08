import { PAGO_TIPO_ID } from './programacion.model';
import { columnasDeRenglones, muestraHoras } from './programacion.renglones';
import { tonoFechaDesde, tonoFechaHasta } from './programacion.constants';

/** Campos que las tres variantes deben traer siempre. */
const COMUNES = [
  'id',
  'contacto_numero_identificacion',
  'contrato_nombre',
  'contrato',
  'fecha_desde',
  'fecha_hasta',
  'salario',
  'total',
];

function campos(pagoTipoId: number | null): string[] {
  return columnasDeRenglones(pagoTipoId).map((c) => c.field);
}

describe('columnasDeRenglones', () => {
  it('las tres variantes comparten identificación, tramo, salario y total', () => {
    for (const tipo of [PAGO_TIPO_ID.NOMINA, PAGO_TIPO_ID.PRIMA, PAGO_TIPO_ID.CESANTIA]) {
      expect(campos(tipo)).toEqual(expect.arrayContaining(COMUNES));
    }
  });

  it('la nómina del periodo desglosa las once clases de hora', () => {
    const f = campos(PAGO_TIPO_ID.NOMINA);
    expect(f).toEqual(
      expect.arrayContaining([
        'dias',
        'dias_transporte',
        'diurna',
        'nocturna',
        'festiva_diurna',
        'festiva_nocturna',
        'extra_diurna',
        'extra_nocturna',
        'extra_festiva_diurna',
        'extra_festiva_nocturna',
        'recargo_nocturno',
        'recargo_festivo_diurno',
        'recargo_festivo_nocturno',
      ]),
    );
  });

  it('la prima trae promedio y no trae horas', () => {
    const f = campos(PAGO_TIPO_ID.PRIMA);
    expect(f).toContain('salario_promedio');
    expect(f).not.toContain('diurna');
    expect(f).not.toContain('base_prestacion');
  });

  it('cesantía e interés comparten set y suman la base de prestación', () => {
    expect(campos(PAGO_TIPO_ID.CESANTIA)).toEqual(campos(PAGO_TIPO_ID.INTERES_CESANTIA));
    expect(campos(PAGO_TIPO_ID.CESANTIA)).toContain('base_prestacion');
    expect(campos(PAGO_TIPO_ID.CESANTIA)).not.toContain('diurna');
  });

  it('un tipo desconocido o nulo cae al set de nómina', () => {
    // Mostrar columnas de más es preferible a esconder datos.
    expect(campos(99)).toEqual(campos(PAGO_TIPO_ID.NOMINA));
    expect(campos(null)).toEqual(campos(PAGO_TIPO_ID.NOMINA));
  });

  it('ninguna variante repite columnas', () => {
    for (const tipo of [PAGO_TIPO_ID.NOMINA, PAGO_TIPO_ID.PRIMA, PAGO_TIPO_ID.CESANTIA]) {
      const f = campos(tipo);
      expect(new Set(f).size).toBe(f.length);
    }
  });

  it('el total siempre cierra la tabla', () => {
    for (const tipo of [PAGO_TIPO_ID.NOMINA, PAGO_TIPO_ID.PRIMA, PAGO_TIPO_ID.CESANTIA]) {
      expect(campos(tipo).at(-1)).toBe('total');
    }
  });
});

describe('muestraHoras', () => {
  it('solo la nómina del periodo', () => {
    expect(muestraHoras(PAGO_TIPO_ID.NOMINA)).toBe(true);
    expect(muestraHoras(PAGO_TIPO_ID.PRIMA)).toBe(false);
    expect(muestraHoras(PAGO_TIPO_ID.CESANTIA)).toBe(false);
    expect(muestraHoras(PAGO_TIPO_ID.INTERES_CESANTIA)).toBe(false);
  });
});

describe('tono de las fechas del renglón', () => {
  const renglon = (marcas: { ingreso?: boolean; retiro?: boolean; error_terminacion?: boolean }) =>
    ({ ingreso: false, retiro: false, error_terminacion: false, ...marcas }) as const;

  it('la fecha desde se marca en verde si el contrato ingresó en el periodo', () => {
    expect(tonoFechaDesde(renglon({ ingreso: true }))).toBe('positive');
    expect(tonoFechaHasta(renglon({ ingreso: true }))).toBeNull();
  });

  it('la fecha hasta se marca en verde si el contrato se retiró en el periodo', () => {
    expect(tonoFechaHasta(renglon({ retiro: true }))).toBe('positive');
    expect(tonoFechaDesde(renglon({ retiro: true }))).toBeNull();
  });

  it('un error de terminación pinta las dos en rojo y gana sobre ingreso y retiro', () => {
    const r = renglon({ ingreso: true, retiro: true, error_terminacion: true });
    expect(tonoFechaDesde(r)).toBe('critical');
    expect(tonoFechaHasta(r)).toBe('critical');
  });

  it('sin marcas, o con una fila que no es objeto, no resalta nada', () => {
    expect(tonoFechaDesde(renglon({}))).toBeNull();
    expect(tonoFechaHasta(null)).toBeNull();
  });

  it('las tres variantes de tabla llevan el resaltado en sus fechas', () => {
    for (const tipo of [PAGO_TIPO_ID.NOMINA, PAGO_TIPO_ID.PRIMA, PAGO_TIPO_ID.CESANTIA]) {
      const cols = columnasDeRenglones(tipo);
      expect(cols.find((c) => c.field === 'fecha_desde')?.toneFor).toBe(tonoFechaDesde);
      expect(cols.find((c) => c.field === 'fecha_hasta')?.toneFor).toBe(tonoFechaHasta);
    }
  });
});
