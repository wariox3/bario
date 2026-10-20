import { cuentaLabel, cuentaOption } from '../cuenta.mapper';
import type { ConfiguracionAporte, ConfiguracionAporteRow } from './configuracion-aporte.model';

/**
 * Fila del backend → fila de la tabla: el tipo traducido (uno sin traducción se
 * muestra tal cual) y la cuenta como etiqueta y como opción para sembrar su
 * selector.
 */
export function toConfiguracionAporteRow(
  aporte: ConfiguracionAporte,
  tipos: Readonly<Record<string, string>>,
): ConfiguracionAporteRow {
  return {
    ...aporte,
    tipo_label: tipos[aporte.tipo] ?? aporte.tipo,
    cuenta_label: cuentaLabel(aporte.cuenta_codigo, aporte.cuenta_nombre),
    cuenta_option: cuentaOption(aporte.cuenta, aporte.cuenta_codigo, aporte.cuenta_nombre),
  };
}
