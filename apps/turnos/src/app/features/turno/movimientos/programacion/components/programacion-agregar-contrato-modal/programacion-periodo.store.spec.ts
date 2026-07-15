import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DocumentoDetalleService, I18nService } from '@reddoc/core';
import { FestivoService, type Festivo } from '../../festivo.service';
import type { ProgramacionLineaRead } from '../../programacion.model';
import { ProgramacionPeriodoStore } from './programacion-periodo.store';

// Segundo nivel de tests: un store con sus servicios HTTP mockeados (sigue sin DOM).
// Observables síncronos (`of`) → las señales se actualizan al llamar el método, así
// se asertan directo. Plantilla para el resto de stores.

function linea(over: Partial<ProgramacionLineaRead> = {}): ProgramacionLineaRead {
  return { fecha_desde: '2026-07-01', fecha_hasta: '2026-07-31', generado: false, ...over };
}

function festivo(fecha: string, nombre = 'Festivo'): Festivo {
  return { id: 1, fecha, nombre };
}

describe('ProgramacionPeriodoStore', () => {
  let store: ProgramacionPeriodoStore;
  let detalle: { obtenerPorId: jest.Mock };
  let festivos: { getDelMes: jest.Mock };

  beforeEach(() => {
    detalle = { obtenerPorId: jest.fn().mockReturnValue(of(linea())) };
    festivos = { getDelMes: jest.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      providers: [
        ProgramacionPeriodoStore,
        { provide: DocumentoDetalleService, useValue: detalle },
        { provide: FestivoService, useValue: festivos },
        { provide: I18nService, useValue: { lang: () => 'es' } },
      ],
    });
    store = TestBed.inject(ProgramacionPeriodoStore);
  });

  it('deriva período, vigencia y generado de la línea; expone los días del mes', () => {
    detalle.obtenerPorId.mockReturnValue(of(linea({ generado: true })));
    store.cargarDesdeLinea(1);

    expect(store.periodo()).toMatchObject({ anio: 2026, mes: 7 });
    expect(store.vigencia()).toEqual({ desde: '2026-07-01', hasta: '2026-07-31' });
    expect(store.generado()).toBe(true);
    expect(store.dias()).toHaveLength(31);
    expect(store.cargando()).toBe(false);
  });

  it('sin fecha_desde deja período nulo pero conserva el flag generado', () => {
    detalle.obtenerPorId.mockReturnValue(of(linea({ fecha_desde: null, generado: true })));
    store.cargarDesdeLinea(1);

    expect(store.periodo()).toBeNull();
    expect(store.generado()).toBe(true);
    expect(store.dias()).toEqual([]);
  });

  it('festivoPorDia marca festivos entre semana, ignora los de sábado y los de otro mes', () => {
    festivos.getDelMes.mockReturnValue(
      of([
        festivo('2026-07-01', 'Miércoles festivo'), // X → se marca
        festivo('2026-07-11', 'Sábado festivo'), // sábado → NO se marca
        festivo('2026-08-15', 'Otro mes'), // fuera del período → se ignora
      ]),
    );
    store.cargarDesdeLinea(1);

    const mapa = store.festivoPorDia();
    expect(mapa.get(1)).toBe('Miércoles festivo');
    expect(mapa.has(11)).toBe(false);
    expect(mapa.has(15)).toBe(false);
    expect(mapa.size).toBe(1);
  });

  it('ante error del detalle limpia el estado y avisa por onError', () => {
    detalle.obtenerPorId.mockReturnValue(throwError(() => new Error('boom')));
    const onError = jest.fn();
    store.cargarDesdeLinea(1, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(store.periodo()).toBeNull();
    expect(store.generado()).toBe(false);
    expect(store.cargando()).toBe(false);
  });

  it('reset limpia período, vigencia, festivos y generado', () => {
    store.cargarDesdeLinea(1);
    store.reset();

    expect(store.periodo()).toBeNull();
    expect(store.vigencia()).toBeNull();
    expect(store.generado()).toBe(false);
    expect(store.festivoPorDia().size).toBe(0);
  });
});
