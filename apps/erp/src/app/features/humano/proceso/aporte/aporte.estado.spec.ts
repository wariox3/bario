import { CAPACIDADES_VACIAS, capacidadesDe, type ContextoAporte } from './aporte.estado';

/** Borrador recién creado, sin contratos cargados. */
const VACIO: ContextoAporte = { estado_generado: false, estado_aprobado: false };
/** Borrador con contratos ya cargados: listo para generar. */
const BORRADOR: ContextoAporte = { ...VACIO, contratos: 12 };
const GENERADO: ContextoAporte = {
  estado_generado: true,
  estado_aprobado: false,
  contratos: 12,
};
const APROBADO: ContextoAporte = {
  estado_generado: true,
  estado_aprobado: true,
  contratos: 12,
};

// Cómo se deriva la etapa se prueba en `../shared/proceso.estado.spec.ts`; acá
// solo se fija qué habilita cada una para el aporte.

describe('capacidadesDe — borrador', () => {
  it('permite armar el aporte', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeEditarCabecera).toBe(true);
    expect(c.puedeCargarContratos).toBe(true);
    expect(c.puedeEliminarContrato).toBe(true);
    expect(c.puedeEliminar).toBe(true);
  });

  it('permite generar solo con contratos cargados', () => {
    expect(capacidadesDe(BORRADOR).puedeGenerar).toBe(true);
    expect(capacidadesDe(VACIO).puedeGenerar).toBe(false);
  });

  it('sin el conteo de contratos no deja generar', () => {
    // `contratos` ausente = "no sé todavía": no se ofrece la acción.
    expect(capacidadesDe(VACIO).puedeGenerar).toBe(false);
  });

  it('no ofrece el plano del operador antes de liquidar', () => {
    // Es el entregable del proceso: sin líneas calculadas no hay nada que entregar.
    expect(capacidadesDe(BORRADOR).puedeGenerarPlano).toBe(false);
  });

  it('no ofrece nada del tramo posterior', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeDesgenerar).toBe(false);
    expect(c.puedeAprobar).toBe(false);
    expect(c.puedeDesaprobar).toBe(false);
  });
});

describe('capacidadesDe — generado', () => {
  it('congela el contenido', () => {
    const c = capacidadesDe(GENERADO);
    expect(c.puedeEditarCabecera).toBe(false);
    expect(c.puedeCargarContratos).toBe(false);
    expect(c.puedeEliminarContrato).toBe(false);
    expect(c.puedeEliminar).toBe(false);
  });

  it('ofrece aprobar, desgenerar y el plano, y no volver a generar', () => {
    const c = capacidadesDe(GENERADO);
    expect(c.puedeAprobar).toBe(true);
    expect(c.puedeDesgenerar).toBe(true);
    expect(c.puedeGenerarPlano).toBe(true);
    expect(c.puedeGenerar).toBe(false);
  });
});

describe('capacidadesDe — aprobado', () => {
  it('solo deja desaprobar y descargar el plano', () => {
    const c = capacidadesDe(APROBADO);
    expect(c.puedeDesaprobar).toBe(true);
    expect(c.puedeGenerarPlano).toBe(true);
  });

  it('no deja desgenerar directamente: hay que desaprobar primero', () => {
    expect(capacidadesDe(APROBADO).puedeDesgenerar).toBe(false);
  });

  it('no deja tocar el contenido ni eliminar el aporte', () => {
    const c = capacidadesDe(APROBADO);
    expect(c.puedeEditarCabecera).toBe(false);
    expect(c.puedeCargarContratos).toBe(false);
    expect(c.puedeEliminarContrato).toBe(false);
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
