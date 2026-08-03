import { TIPO_SIN_CLASIFICAR, agruparEntidades } from './aporte.entidades';
import type { AporteEntidad } from './aporte.model';

function entidad(
  id: number,
  tipo: string | null,
  cotizacion: string | number | null,
): AporteEntidad {
  return { id, tipo, entidad_id: id, entidad__nombre: `Entidad ${id}`, cotizacion };
}

describe('agruparEntidades', () => {
  it('sin entidades no arma grupos y el total es cero', () => {
    expect(agruparEntidades([])).toEqual({ grupos: [], total: 0 });
  });

  it('agrupa por tipo y suma el subtotal de cada uno', () => {
    const { grupos } = agruparEntidades([
      entidad(1, 'Salud', 100),
      entidad(2, 'Salud', 250),
      entidad(3, 'Pensión', 400),
    ]);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].tipo).toBe('Salud');
    expect(grupos[0].entidades).toHaveLength(2);
    expect(grupos[0].subtotal).toBe(350);
    expect(grupos[1].subtotal).toBe(400);
  });

  it('el total general es la suma de todos los subtotales', () => {
    const { total } = agruparEntidades([
      entidad(1, 'Salud', 100),
      entidad(2, 'Pensión', 250),
      entidad(3, 'Riesgos', 30),
    ]);

    expect(total).toBe(380);
  });

  it('respeta el orden de llegada de los tipos', () => {
    // El backend ordena por tipo; reordenar acá cambiaría cómo se lee el reporte.
    const { grupos } = agruparEntidades([
      entidad(1, 'Riesgos', 10),
      entidad(2, 'Caja', 20),
      entidad(3, 'Riesgos', 30),
    ]);

    expect(grupos.map((grupo) => grupo.tipo)).toEqual(['Riesgos', 'Caja']);
  });

  it('suma los importes que llegan como string decimal', () => {
    const { total } = agruparEntidades([
      entidad(1, 'Salud', '1500.50'),
      entidad(2, 'Salud', '0.50'),
    ]);

    expect(total).toBe(1501);
  });

  it('cuenta como cero lo que no es numérico, en vez de romper la suma', () => {
    const { total } = agruparEntidades([
      entidad(1, 'Salud', null),
      entidad(2, 'Salud', 'no-es-un-numero'),
      entidad(3, 'Salud', 100),
    ]);

    expect(total).toBe(100);
  });

  it('no pierde del total a las entidades que llegan sin tipo', () => {
    const { grupos, total } = agruparEntidades([entidad(1, null, 75), entidad(2, 'Salud', 25)]);

    expect(grupos[0].tipo).toBe(TIPO_SIN_CLASIFICAR);
    expect(total).toBe(100);
  });
});
