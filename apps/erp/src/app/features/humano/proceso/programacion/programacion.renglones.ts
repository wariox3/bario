/**
 * Qué columnas tiene la tabla de renglones según el tipo de pago. Función pura,
 * testeada en `programacion.renglones.spec.ts`.
 *
 * El ERP anterior resolvía esto con tres componentes de tabla completos
 * (`tabla-encabezado-general`, `-prima`, `-cesantia`), cada uno con su plantilla de
 * ~200 líneas y su propia copia de la lógica de selección. Las tres comparten
 * identificación, tramo del contrato, salario y total: lo único que cambia es el
 * bloque del medio, así que acá es un juego de columnas y una tabla.
 */
import type { ColumnDef } from '@reddoc/core';
import {
  RENGLON_COLUMNS_CESANTIA,
  RENGLON_COLUMNS_NOMINA,
  RENGLON_COLUMNS_PRIMA,
} from './programacion.constants';
import { PAGO_TIPO_ID } from './programacion.model';

/**
 * Columnas de los renglones para un tipo de pago.
 *
 * Cesantía e interés comparten set: los dos liquidan sobre la base de prestación.
 * Cualquier tipo desconocido cae al de nómina, que es el más completo — mostrar
 * columnas de más es preferible a esconder datos.
 */
export function columnasDeRenglones(pagoTipoId: number | null): readonly ColumnDef[] {
  switch (pagoTipoId) {
    case PAGO_TIPO_ID.PRIMA:
      return RENGLON_COLUMNS_PRIMA;
    case PAGO_TIPO_ID.CESANTIA:
    case PAGO_TIPO_ID.INTERES_CESANTIA:
      return RENGLON_COLUMNS_CESANTIA;
    default:
      return RENGLON_COLUMNS_NOMINA;
  }
}

/** ¿El tipo de pago desglosa horas y recargos? Solo la nómina del periodo. */
export function muestraHoras(pagoTipoId: number | null): boolean {
  return columnasDeRenglones(pagoTipoId) === RENGLON_COLUMNS_NOMINA;
}
