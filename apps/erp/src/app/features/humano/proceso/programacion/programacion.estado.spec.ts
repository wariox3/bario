import {
  CAPACIDADES_VACIAS,
  capacidadesDe,
  estaCongelada,
  estadoDe,
  type ContextoProgramacion,
} from './programacion.estado';

/** Borrador recién creado, sin contratos cargados. */
const VACIA: ContextoProgramacion = { estado_generado: false, estado_aprobado: false };
/** Borrador con contratos ya cargados: lista para generar. */
const BORRADOR = { ...VACIA, renglones: 3 };
const GENERADA: ContextoProgramacion = {
  estado_generado: true,
  estado_aprobado: false,
  renglones: 3,
};
const APROBADA: ContextoProgramacion = {
  estado_generado: true,
  estado_aprobado: true,
  renglones: 3,
};

describe('estadoDe', () => {
  it('sin banderas es borrador', () => {
    expect(estadoDe(VACIA)).toBe('borrador');
  });

  it('generada sin aprobar es generada', () => {
    expect(estadoDe(GENERADA)).toBe('generada');
  });

  it('aprobada es aprobada', () => {
    expect(estadoDe(APROBADA)).toBe('aprobada');
  });

  it('aprobada sin generar (combinación imposible) se trata como aprobada', () => {
    // Conservador: ante datos incoherentes bloquea más, no menos.
    expect(estadoDe({ estado_generado: false, estado_aprobado: true })).toBe('aprobada');
  });
});

describe('capacidadesDe — borrador', () => {
  it('permite armar la programación', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeEditarCabecera).toBe(true);
    expect(c.puedeCargarContratos).toBe(true);
    expect(c.puedeEditarRenglon).toBe(true);
    expect(c.puedeEliminarRenglon).toBe(true);
    expect(c.puedeGestionarAdicionales).toBe(true);
    expect(c.puedeEliminar).toBe(true);
  });

  it('permite generar e importar horas solo con renglones cargados', () => {
    expect(capacidadesDe(BORRADOR).puedeGenerar).toBe(true);
    expect(capacidadesDe(BORRADOR).puedeImportarHoras).toBe(true);

    expect(capacidadesDe(VACIA).puedeGenerar).toBe(false);
    expect(capacidadesDe(VACIA).puedeImportarHoras).toBe(false);
  });

  it('sin el conteo de renglones no deja generar', () => {
    // `renglones` ausente = "no sé todavía": no se ofrece la acción.
    expect(capacidadesDe(VACIA).puedeGenerar).toBe(false);
  });

  it('no ofrece nada del tramo posterior', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeDesgenerar).toBe(false);
    expect(c.puedeAprobar).toBe(false);
    expect(c.puedeDesaprobar).toBe(false);
    expect(c.puedeNotificar).toBe(false);
    expect(c.puedeImprimirNominas).toBe(false);
  });
});

describe('capacidadesDe — generada', () => {
  it('congela el contenido', () => {
    const c = capacidadesDe(GENERADA);
    expect(c.puedeEditarCabecera).toBe(false);
    expect(c.puedeCargarContratos).toBe(false);
    expect(c.puedeEditarRenglon).toBe(false);
    expect(c.puedeEliminarRenglon).toBe(false);
    expect(c.puedeGestionarAdicionales).toBe(false);
    expect(c.puedeImportarHoras).toBe(false);
    expect(c.puedeEliminar).toBe(false);
  });

  it('ofrece aprobar, desgenerar e imprimir, y no volver a generar', () => {
    const c = capacidadesDe(GENERADA);
    expect(c.puedeAprobar).toBe(true);
    expect(c.puedeDesgenerar).toBe(true);
    expect(c.puedeImprimirNominas).toBe(true);
    expect(c.puedeGenerar).toBe(false);
  });

  it('no permite notificar antes de aprobar', () => {
    expect(capacidadesDe(GENERADA).puedeNotificar).toBe(false);
  });
});

describe('capacidadesDe — aprobada', () => {
  it('solo deja desaprobar, notificar e imprimir', () => {
    const c = capacidadesDe(APROBADA);
    expect(c.puedeDesaprobar).toBe(true);
    expect(c.puedeNotificar).toBe(true);
    expect(c.puedeImprimirNominas).toBe(true);
  });

  it('no deja desgenerar directamente: hay que desaprobar primero', () => {
    // Es la secuencia que protege las nóminas ya contabilizadas.
    expect(capacidadesDe(APROBADA).puedeDesgenerar).toBe(false);
  });

  it('no deja tocar el contenido ni eliminar la programación', () => {
    const c = capacidadesDe(APROBADA);
    expect(c.puedeEditarCabecera).toBe(false);
    expect(c.puedeEditarRenglon).toBe(false);
    expect(c.puedeEliminarRenglon).toBe(false);
    expect(c.puedeGenerar).toBe(false);
    expect(c.puedeAprobar).toBe(false);
    expect(c.puedeEliminar).toBe(false);
  });
});

describe('CAPACIDADES_VACIAS', () => {
  it('no habilita ninguna acción destructiva mientras la cabecera carga', () => {
    expect(CAPACIDADES_VACIAS.puedeGenerar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeDesgenerar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeAprobar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeEliminar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeEditarCabecera).toBe(false);
  });
});

describe('estaCongelada', () => {
  it('solo el borrador admite cambios', () => {
    expect(estaCongelada(BORRADOR)).toBe(false);
    expect(estaCongelada(GENERADA)).toBe(true);
    expect(estaCongelada(APROBADA)).toBe(true);
  });
});
