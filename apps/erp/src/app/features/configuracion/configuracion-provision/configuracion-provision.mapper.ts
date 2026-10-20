import { cuentaLabel, cuentaOption } from '../cuenta.mapper';
import { PROVISION_SIN_CREDITO } from './configuracion-provision.constants';
import type {
  ConfiguracionProvision,
  ConfiguracionProvisionRow,
} from './configuracion-provision.model';

/** Si la provisión lleva cuenta crédito (no la llevan los aportes). */
export function provisionLlevaCredito(provision: ConfiguracionProvision): boolean {
  return !PROVISION_SIN_CREDITO.includes(provision.tipo);
}

/**
 * Fila del backend → fila de la tabla: el tipo traducido (uno sin traducción se
 * muestra tal cual) y cada cuenta como etiqueta y como opción para sembrar su
 * selector.
 */
export function toConfiguracionProvisionRow(
  provision: ConfiguracionProvision,
  tipos: Readonly<Record<string, string>>,
): ConfiguracionProvisionRow {
  return {
    ...provision,
    tipo_label: tipos[provision.tipo] ?? provision.tipo,
    lleva_credito: provisionLlevaCredito(provision),
    cuenta_debito_label: cuentaLabel(
      provision.cuenta_debito_codigo,
      provision.cuenta_debito_nombre,
    ),
    cuenta_debito_option: cuentaOption(
      provision.cuenta_debito,
      provision.cuenta_debito_codigo,
      provision.cuenta_debito_nombre,
    ),
    cuenta_credito_label: cuentaLabel(
      provision.cuenta_credito_codigo,
      provision.cuenta_credito_nombre,
    ),
    cuenta_credito_option: cuentaOption(
      provision.cuenta_credito,
      provision.cuenta_credito_codigo,
      provision.cuenta_credito_nombre,
    ),
  };
}
