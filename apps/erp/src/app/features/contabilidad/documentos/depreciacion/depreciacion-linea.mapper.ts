import { redondearMoneda, toFiniteNumber } from '@reddoc/core';
import type { DepreciacionLineaRead, DepreciacionLineaView } from './depreciacion-linea.model';

/** Read-model (GET) → línea normalizada para la tabla. */
export function depreciacionLineaToView(read: DepreciacionLineaRead): DepreciacionLineaView {
  return {
    id: read.id ?? null,
    activo: read.activo ?? null,
    codigo: read.activo_codigo ?? '',
    nombre: read.activo_nombre ?? '',
    dias: toFiniteNumber(read.dias) ?? 0,
    valor: toFiniteNumber(read.precio) ?? 0,
  };
}

/**
 * Total depreciado del documento: la suma de las líneas cargadas.
 *
 * Se calcula en el front para que el usuario vea el total apenas carga los
 * activos, sin tener que guardar y recargar. Como las líneas vienen del backend,
 * debería coincidir con su propio cálculo. Redondeo de moneda una sola vez, al
 * final: acumular ya redondeado arrastra el error.
 */
export function sumarLineasDepreciacion(lines: readonly DepreciacionLineaView[]): number {
  let total = 0;
  for (const line of lines) total += line.valor;
  return redondearMoneda(total);
}
