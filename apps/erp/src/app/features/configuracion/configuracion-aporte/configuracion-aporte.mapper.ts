import type { ErpSelectOption } from '@reddoc/core';
import { cuentaLabel, cuentaOption } from '../cuenta.mapper';
import type {
  ConfiguracionAporte,
  ConfiguracionAportePayload,
  ConfiguracionAporteRow,
} from './configuracion-aporte.model';

/** Fila del backend → fila de la tabla. Un tipo sin traducción se muestra tal cual. */
export function toConfiguracionAporteRow(
  aporte: ConfiguracionAporte,
  tipos: Readonly<Record<string, string>>,
): ConfiguracionAporteRow {
  return {
    ...aporte,
    tipo_label: tipos[aporte.tipo] ?? aporte.tipo,
    cuenta_label: cuentaLabel(aporte.cuenta_codigo, aporte.cuenta_nombre),
  };
}

export interface ConfiguracionAporteFormValue {
  readonly cuenta: ErpSelectOption | null;
}

export function configuracionAporteToForm(
  aporte: ConfiguracionAporte,
): ConfiguracionAporteFormValue {
  return { cuenta: cuentaOption(aporte.cuenta, aporte.cuenta_codigo, aporte.cuenta_nombre) };
}

/** Vaciar la cuenta manda `null`: omitir la clave en un PATCH la dejaría como estaba. */
export function configuracionAporteFormToPayload(
  form: ConfiguracionAporteFormValue,
): ConfiguracionAportePayload {
  return { cuenta: form.cuenta?.id ?? null };
}
