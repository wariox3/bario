import type { ErpSelectOption } from '@reddoc/core';
import { cuentaLabel, cuentaOption } from '../cuenta.mapper';
import { PROVISION_SIN_CREDITO } from './configuracion-provision.constants';
import type {
  ConfiguracionProvision,
  ConfiguracionProvisionPayload,
  ConfiguracionProvisionRow,
} from './configuracion-provision.model';

/** Si la provisión lleva cuenta crédito (no la llevan los aportes). */
export function provisionLlevaCredito(provision: ConfiguracionProvision): boolean {
  return !PROVISION_SIN_CREDITO.includes(provision.tipo);
}

/** Fila del backend → fila de la tabla. Un tipo sin traducción se muestra tal cual. */
export function toConfiguracionProvisionRow(
  provision: ConfiguracionProvision,
  tipos: Readonly<Record<string, string>>,
): ConfiguracionProvisionRow {
  return {
    ...provision,
    tipo_label: tipos[provision.tipo] ?? provision.tipo,
    cuenta_debito_label: cuentaLabel(
      provision.cuenta_debito_codigo,
      provision.cuenta_debito_nombre,
    ),
    cuenta_credito_label: cuentaLabel(
      provision.cuenta_credito_codigo,
      provision.cuenta_credito_nombre,
    ),
  };
}

export interface ConfiguracionProvisionFormValue {
  readonly cuenta_debito: ErpSelectOption | null;
  readonly cuenta_credito: ErpSelectOption | null;
}

export function configuracionProvisionToForm(
  provision: ConfiguracionProvision,
): ConfiguracionProvisionFormValue {
  return {
    cuenta_debito: cuentaOption(
      provision.cuenta_debito,
      provision.cuenta_debito_codigo,
      provision.cuenta_debito_nombre,
    ),
    cuenta_credito: cuentaOption(
      provision.cuenta_credito,
      provision.cuenta_credito_codigo,
      provision.cuenta_credito_nombre,
    ),
  };
}

/**
 * Vaciar una cuenta manda `null`. La crédito no viaja en las provisiones que no
 * la llevan, para no tocar lo que el backend tenga ahí.
 */
export function configuracionProvisionFormToPayload(
  form: ConfiguracionProvisionFormValue,
  llevaCredito: boolean,
): ConfiguracionProvisionPayload {
  const cuenta_debito = form.cuenta_debito?.id ?? null;
  return llevaCredito
    ? { cuenta_debito, cuenta_credito: form.cuenta_credito?.id ?? null }
    : { cuenta_debito };
}
