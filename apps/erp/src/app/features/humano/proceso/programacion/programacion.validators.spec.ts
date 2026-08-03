import { FormControl, FormGroup } from '@angular/forms';
import {
  diasRequeridos,
  duracionPeriodoExacta,
  rangoFechasValido,
} from './programacion.validators';

/** Grupo mínimo con las dos fechas, como el del formulario real. */
function grupo(desde: Date | null, hasta: Date | null): FormGroup {
  return new FormGroup({
    fecha_desde: new FormControl<Date | null>(desde),
    fecha_hasta: new FormControl<Date | null>(hasta),
  });
}

/** Fecha local sin hora, como la entrega el datepicker. */
function fecha(año: number, mes1Based: number, dia: number): Date {
  return new Date(año, mes1Based - 1, dia);
}

describe('rangoFechasValido', () => {
  it('acepta desde anterior a hasta', () => {
    const g = grupo(fecha(2026, 1, 1), fecha(2026, 1, 31));
    expect(rangoFechasValido()(g)).toBeNull();
  });

  it('acepta desde igual a hasta', () => {
    const g = grupo(fecha(2026, 1, 15), fecha(2026, 1, 15));
    expect(rangoFechasValido()(g)).toBeNull();
  });

  it('rechaza desde posterior a hasta', () => {
    const g = grupo(fecha(2026, 2, 1), fecha(2026, 1, 31));
    expect(rangoFechasValido()(g)).toEqual({ rangoFechasInvalido: true });
  });

  it('no opina si falta una fecha', () => {
    expect(rangoFechasValido()(grupo(null, fecha(2026, 1, 31)))).toBeNull();
    expect(rangoFechasValido()(grupo(fecha(2026, 1, 1), null))).toBeNull();
  });
});

describe('duracionPeriodoExacta', () => {
  it('acepta un mes de 30 días que dura 30', () => {
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 4, 30));
    expect(duracionPeriodoExacta(30)(g)).toBeNull();
  });

  it('acepta una quincena que dura 15', () => {
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 4, 15));
    expect(duracionPeriodoExacta(15)(g)).toBeNull();
  });

  it('rechaza un periodo más corto que el del grupo', () => {
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 4, 20));
    expect(duracionPeriodoExacta(30)(g)).toEqual({
      duracionPeriodo: { requeridos: 30, duracion: 20 },
    });
  });

  it('rechaza un periodo más largo: es igualdad, no mínimo', () => {
    // El validador del legacy se llama "minimum" pero compara por igualdad.
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 5, 5));
    expect(duracionPeriodoExacta(30)(g)).toEqual({
      duracionPeriodo: { requeridos: 30, duracion: 35 },
    });
  });

  it('no valida sin días de periodo (grupo sin elegir)', () => {
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 4, 3));
    expect(duracionPeriodoExacta(0)(g)).toBeNull();
  });

  it('no opina si falta una fecha', () => {
    expect(duracionPeriodoExacta(30)(grupo(null, null))).toBeNull();
  });

  it('cuenta los días de forma inclusiva', () => {
    // Del 1 al 15 son 15 días, no 14.
    const g = grupo(fecha(2026, 4, 1), fecha(2026, 4, 15));
    expect(duracionPeriodoExacta(14)(g)).toEqual({
      duracionPeriodo: { requeridos: 14, duracion: 15 },
    });
  });
});

describe('diasRequeridos — ajuste de febrero', () => {
  it('fuera de febrero devuelve los días del periodo tal cual', () => {
    expect(diasRequeridos(fecha(2026, 4, 1), 30)).toBe(30);
    expect(diasRequeridos(fecha(2026, 1, 16), 15)).toBe(15);
  });

  it('un periodo mensual en febrero dura lo que el mes', () => {
    expect(diasRequeridos(fecha(2026, 2, 1), 30)).toBe(28);
  });

  it('reconoce el año bisiesto', () => {
    expect(diasRequeridos(fecha(2028, 2, 1), 30)).toBe(29);
  });

  it('una quincena que cabe en febrero dura los 15', () => {
    expect(diasRequeridos(fecha(2026, 2, 1), 15)).toBe(15);
  });

  it('la segunda quincena de febrero dura lo que queda del mes', () => {
    // Del 16 al 28 son 13 días, no 15.
    expect(diasRequeridos(fecha(2026, 2, 16), 15)).toBe(13);
  });

  it('la segunda quincena de un febrero bisiesto dura un día más', () => {
    expect(diasRequeridos(fecha(2028, 2, 16), 15)).toBe(14);
  });
});

describe('duracionPeriodoExacta — febrero de punta a punta', () => {
  it('acepta la nómina mensual de febrero (1 al 28)', () => {
    const g = grupo(fecha(2026, 2, 1), fecha(2026, 2, 28));
    expect(duracionPeriodoExacta(30)(g)).toBeNull();
  });

  it('acepta la segunda quincena de febrero (16 al 28)', () => {
    const g = grupo(fecha(2026, 2, 16), fecha(2026, 2, 28));
    expect(duracionPeriodoExacta(15)(g)).toBeNull();
  });

  it('rechaza estirar febrero hasta el 2 de marzo', () => {
    const g = grupo(fecha(2026, 2, 1), fecha(2026, 3, 2));
    expect(duracionPeriodoExacta(30)(g)).toEqual({
      duracionPeriodo: { requeridos: 28, duracion: 30 },
    });
  });
});
