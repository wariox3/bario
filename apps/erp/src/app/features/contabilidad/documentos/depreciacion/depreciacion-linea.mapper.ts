import { redondearMoneda, toFiniteNumber } from '@reddoc/core';
import type { DepreciacionLineaRead, DepreciacionLineaView } from './depreciacion-linea.model';

/**
 * Read-model (GET) → línea normalizada para la tabla.
 *
 * El valor sale de `total`, no de `precio`: el cargue prorratea la cuota por los
 * días que el activo estuvo vivo en el mes, así que `precio` puede ser una cuota
 * diaria. `total` siempre es el valor depreciado del periodo.
 */
export function depreciacionLineaToView(read: DepreciacionLineaRead): DepreciacionLineaView {
  return {
    id: read.id ?? null,
    activo: read.activo ?? null,
    codigo: read.activo_codigo ?? '',
    nombre: read.activo_nombre ?? '',
    valor: toFiniteNumber(read.total) ?? 0,
  };
}

/**
 * Total depreciado del documento: la suma de las líneas cargadas.
 *
 * Es solo para mostrar. El `total` del documento lo calcula el backend y viene
 * de solo lectura, así que esta suma no viaja en ningún payload; sirve para que
 * el usuario vea el importe apenas carga los activos. Redondeo de moneda una
 * sola vez, al final: acumular ya redondeado arrastra el error.
 */
export function sumarLineasDepreciacion(lines: readonly DepreciacionLineaView[]): number {
  let total = 0;
  for (const line of lines) total += line.valor;
  return redondearMoneda(total);
}
