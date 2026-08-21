import type { ConfiguracionCampo } from './configuracion.model';

/**
 * Campos por área de la configuración (singleton field-scoped). Cada lista
 * declara qué campos lee y persiste su área; el adaptador correspondiente
 * (interfaces `*ConfigFormValue` + funciones `to/from`) vive en el mapper.
 */

// ── Área General (UVT) ────────────────────────────────────────────────────────

/** Campos que el área General lee y persiste (field-scoped). */
export const GENERAL_CAMPOS = ['gen_uvt'] as const satisfies readonly ConfiguracionCampo[];

// ── Área Humano ───────────────────────────────────────────────────────────────

/** Campos que el área Humano lee y persiste (field-scoped). */
export const HUMANO_CAMPOS = [
  'hum_salario_minimo',
  'hum_factor',
  'hum_auxilio_transporte',
] as const satisfies readonly ConfiguracionCampo[];

// ── Área Empresa (datos de la empresa) ────────────────────────────────────────

/**
 * Campos de los datos de empresa. Los pide el paso «Datos de la empresa» del
 * asistente de facturación electrónica; la pestaña de Configuración todavía no
 * está habilitada.
 */
export const EMPRESA_CAMPOS = [
  'gen_empresa_razon_social',
  'gen_empresa_tipo_persona',
  'gen_empresa_identificacion',
  'gen_empresa_numero_identificacion',
  'gen_empresa_digito_verificacion',
  'gen_empresa_direccion',
  'gen_empresa_ciudad',
  'gen_empresa_telefono',
  'gen_empresa_correo',
] as const satisfies readonly ConfiguracionCampo[];
