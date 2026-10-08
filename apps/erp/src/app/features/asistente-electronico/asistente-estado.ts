import type {
  ConfiguracionCampo,
  ConfiguracionRead,
} from '@erp/features/configuracion/configuracion.model';

/**
 * Campos que el formulario de la empresa exige (`Validators.required` en
 * `EmpresaConfigComponent`). El teléfono es opcional y el DV se calcula.
 * Si el formulario suma o quita un obligatorio, se actualiza acá también.
 */
export const EMPRESA_OBLIGATORIOS = [
  'gen_empresa_razon_social',
  'gen_empresa_nombre_corto',
  'gen_empresa_tipo_persona',
  'gen_empresa_identificacion',
  'gen_empresa_numero_identificacion',
  'gen_empresa_direccion',
  'gen_empresa_ciudad',
  'gen_empresa_correo',
] as const satisfies readonly ConfiguracionCampo[];

/** ¿La empresa tiene guardado todo lo que su formulario pide? */
export function empresaCompleta(config: Partial<ConfiguracionRead>): boolean {
  return EMPRESA_OBLIGATORIOS.every((campo) => {
    const valor = config[campo];
    return typeof valor === 'string' ? valor.trim() !== '' : valor != null;
  });
}
