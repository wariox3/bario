import { CAPACIDADES_VACIAS, capacidadesDe, type ContextoLiquidacion } from './liquidacion.estado';

const BORRADOR: ContextoLiquidacion = { estado_generado: false, estado_aprobado: false };
const GENERADA: ContextoLiquidacion = { estado_generado: true, estado_aprobado: false };
const APROBADA: ContextoLiquidacion = { estado_generado: true, estado_aprobado: true };

// Cómo se deriva la etapa se prueba en `../shared/proceso.estado.spec.ts`; acá
// solo se fija qué habilita cada una para la liquidación.

describe('capacidadesDe — borrador', () => {
  it('permite calcular y ajustar', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeGenerar).toBe(true);
    expect(c.puedeReliquidar).toBe(true);
    expect(c.puedeGestionarAdicionales).toBe(true);
    expect(c.puedeEliminar).toBe(true);
  });

  it('no ofrece nada del tramo posterior', () => {
    const c = capacidadesDe(BORRADOR);
    expect(c.puedeDesgenerar).toBe(false);
    expect(c.puedeAprobar).toBe(false);
    expect(c.puedeDesaprobar).toBe(false);
  });
});

describe('capacidadesDe — generada', () => {
  it('congela los adicionales', () => {
    // Cambiarlos despues moveria el total sin rehacer el calculo.
    expect(capacidadesDe(GENERADA).puedeGestionarAdicionales).toBe(false);
  });

  it('ofrece aprobar y desgenerar, y no volver a generar ni reliquidar', () => {
    const c = capacidadesDe(GENERADA);
    expect(c.puedeAprobar).toBe(true);
    expect(c.puedeDesgenerar).toBe(true);
    expect(c.puedeGenerar).toBe(false);
    expect(c.puedeReliquidar).toBe(false);
  });

  it('no deja eliminar una liquidación ya calculada', () => {
    expect(capacidadesDe(GENERADA).puedeEliminar).toBe(false);
  });
});

describe('capacidadesDe — aprobada', () => {
  it('solo deja desaprobar', () => {
    const c = capacidadesDe(APROBADA);
    expect(c.puedeDesaprobar).toBe(true);
    expect(c.puedeGenerar).toBe(false);
    expect(c.puedeReliquidar).toBe(false);
    expect(c.puedeAprobar).toBe(false);
    expect(c.puedeGestionarAdicionales).toBe(false);
    expect(c.puedeEliminar).toBe(false);
  });

  it('no deja desgenerar directamente: hay que desaprobar primero', () => {
    expect(capacidadesDe(APROBADA).puedeDesgenerar).toBe(false);
  });
});

describe('CAPACIDADES_VACIAS', () => {
  it('no habilita ninguna acción mientras la cabecera carga', () => {
    expect(CAPACIDADES_VACIAS.puedeGenerar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeReliquidar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeDesgenerar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeAprobar).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeGestionarAdicionales).toBe(false);
    expect(CAPACIDADES_VACIAS.puedeEliminar).toBe(false);
  });
});
