import { FormControl, FormGroup } from '@angular/forms';
import {
  cuotaNoSuperaTotal,
  cuotaSugerida,
  cuotasNecesarias,
  mismoMontoVisible,
  planDeCuotas,
} from './credito-cuotas';

describe('cuotasNecesarias', () => {
  it('divide exacto cuando el total lo permite', () => {
    expect(cuotasNecesarias(10000, 1000)).toBe(10);
  });

  // 3333.33 × 3 = 9999.99: sin tolerancia pediría una cuarta cuota de un centavo.
  it('tolera el centavo que deja el redondeo', () => {
    expect(cuotasNecesarias(10000, 3333.33)).toBe(3);
  });

  it('redondea hacia arriba: la última cuota es menor', () => {
    expect(cuotasNecesarias(10000, 1500)).toBe(7);
    expect(cuotasNecesarias(10000, 3000)).toBe(4);
  });

  it('no calcula nada si falta un dato o no es positivo', () => {
    expect(cuotasNecesarias(null, 1000)).toBeNull();
    expect(cuotasNecesarias(10000, null)).toBeNull();
    expect(cuotasNecesarias(10000, 0)).toBeNull();
  });
});

describe('cuotaSugerida', () => {
  it('reparte el total en partes iguales', () => {
    expect(cuotaSugerida(10000, 10)).toBe(1000);
  });

  // Al centavo daría 3333.33, y como la moneda se muestra sin decimales, la
  // cuota y la última se imprimirían iguales difiriendo en un centavo.
  it('redondea a pesos, no a centavos', () => {
    expect(cuotaSugerida(10000, 3)).toBe(3334);
    expect(cuotaSugerida(120000, 11)).toBe(10910);
  });

  // Hacia abajo, 120.000 en 11 daría 10.909: por 11 deja un peso sin cubrir y
  // haría falta una cuota extra de $ 1 para saldar.
  it('redondea hacia arriba para no agregar una cuota de vuelto', () => {
    expect(cuotasNecesarias(120000, cuotaSugerida(120000, 11))).toBe(11);
    expect(cuotasNecesarias(1000000, cuotaSugerida(1000000, 12))).toBe(12);
    expect(cuotasNecesarias(50000, cuotaSugerida(50000, 7))).toBe(7);
  });

  it('no sugiere nada si falta un dato o no es positivo', () => {
    expect(cuotaSugerida(null, 10)).toBeNull();
    expect(cuotaSugerida(10000, null)).toBeNull();
    expect(cuotaSugerida(0, 10)).toBeNull();
    expect(cuotaSugerida(10000, 0)).toBeNull();
  });
});

describe('planDeCuotas', () => {
  it('cuadra cuando el total se divide exacto', () => {
    expect(planDeCuotas(10000, 1000, 10)).toEqual({ cuotas: 10, ultima: 1000, cuadra: true });
  });

  // 3333.33 × 3 = 9999.99: sin tolerancia esto pediría una cuarta cuota de un
  // centavo, y el aviso aparecería sobre un crédito que está bien.
  it('tolera el centavo que deja el redondeo', () => {
    expect(planDeCuotas(10000, 3333.33, 3)).toEqual({ cuotas: 3, ultima: 3333.34, cuadra: true });
  });

  it('avisa cuando la cuota manual salda antes', () => {
    // 10.000 en cuotas de 1.500: entran 6 completas y una de 1.000.
    expect(planDeCuotas(10000, 1500, 10)).toEqual({ cuotas: 7, ultima: 1000, cuadra: false });
  });

  it('avisa cuando la cuota manual no alcanza', () => {
    // Con 10 cuotas de 500 solo se cubren 5.000: hacen falta 20.
    expect(planDeCuotas(10000, 500, 10)).toEqual({ cuotas: 20, ultima: 500, cuadra: false });
  });

  it('no arma un plan a medias mientras el formulario se llena', () => {
    expect(planDeCuotas(null, 1000, 10)).toBeNull();
    expect(planDeCuotas(10000, null, 10)).toBeNull();
    expect(planDeCuotas(0, 1000, 10)).toBeNull();
  });
});

describe('cuotaNoSuperaTotal', () => {
  const grupo = (total: number | null, cuota: number | null): FormGroup =>
    new FormGroup({ total: new FormControl(total), cuota: new FormControl(cuota) });

  it('rechaza una cuota mayor que el total', () => {
    expect(cuotaNoSuperaTotal(grupo(10000, 12000))).toEqual({ cuotaSuperaTotal: true });
  });

  it('acepta la cuota igual al total: es un crédito de una sola cuota', () => {
    expect(cuotaNoSuperaTotal(grupo(10000, 10000))).toBeNull();
  });

  it('acepta la cuota menor', () => {
    expect(cuotaNoSuperaTotal(grupo(10000, 1000))).toBeNull();
  });

  // De los vacíos se ocupan `required` y `montoPositivo`: dos errores por el
  // mismo campo hacen que se lea el que no sirve.
  it('no opina sobre los vacíos ni los no positivos', () => {
    expect(cuotaNoSuperaTotal(grupo(null, 1000))).toBeNull();
    expect(cuotaNoSuperaTotal(grupo(10000, null))).toBeNull();
    expect(cuotaNoSuperaTotal(grupo(0, 1000))).toBeNull();
  });
});

describe('mismoMontoVisible', () => {
  // La moneda del ERP no muestra centavos: si dos montos se imprimen igual,
  // anunciar que son distintos confunde en vez de informar.
  it('ignora las diferencias que no se ven', () => {
    expect(mismoMontoVisible(10909.09, 10909.1)).toBe(true);
    expect(mismoMontoVisible(1000, 1000)).toBe(true);
  });

  it('distingue las que sí se ven', () => {
    expect(mismoMontoVisible(10910, 10900)).toBe(false);
    expect(mismoMontoVisible(1500, 1000)).toBe(false);
  });
});

describe('el crédito se salda completo', () => {
  // La suma de las cuotas tiene que dar el total: si no, el empleado paga de
  // más o queda debiendo.
  it.each([
    [120000, 11],
    [10000, 10],
    [10000, 3],
    [1000000, 12],
    [50000, 7],
  ])('%i en %i cuotas', (total, cantidad) => {
    const cuota = cuotaSugerida(total, cantidad) as number;
    const plan = planDeCuotas(total, cuota, cantidad);
    expect(plan).not.toBeNull();
    expect(plan?.cuotas).toBe(cantidad);
    expect(cuota * ((plan?.cuotas ?? 0) - 1) + (plan?.ultima ?? 0)).toBeCloseTo(total, 2);
  });
});
