import type { ConfiguracionCampo } from './configuracion.model';

/**
 * Campos por área de la configuración (singleton field-scoped). Cada lista
 * declara qué campos lee y persiste su área; el adaptador correspondiente
 * (interfaces `*ConfigFormValue` + funciones `to/from`) vive en el mapper.
 */

// ── Área General (UVT) ────────────────────────────────────────────────────────

/** Campos que el área General lee y persiste (field-scoped). */
export const GENERAL_CAMPOS = [
  'gen_uvt',
  'gen_emitir_automaticamente',
] as const satisfies readonly ConfiguracionCampo[];

// ── Área Humano ───────────────────────────────────────────────────────────────

/** Campos que el área Humano lee y persiste (field-scoped). */
export const HUMANO_CAMPOS = [
  'hum_salario_minimo',
  'hum_factor',
  'hum_auxilio_transporte',
] as const satisfies readonly ConfiguracionCampo[];

// ── Área Venta ────────────────────────────────────────────────────────────────

/** Campos de la sub-pestaña Formato de Venta (textos de la factura impresa). */
export const VENTA_FORMATO_CAMPOS = [
  'ven_factura_informacion_superior',
  'ven_factura_informacion_inferior',
] as const satisfies readonly ConfiguracionCampo[];

/**
 * Campos de la sub-pestaña AIU de Venta. Lee también los `_nombre` para pintar
 * cada ítem sin otra consulta; se persisten solo los ids.
 */
export const VENTA_AIU_CAMPOS = [
  'ven_item_administracion',
  'ven_item_administracion_nombre',
  'ven_item_imprevisto',
  'ven_item_imprevisto_nombre',
  'ven_item_utilidad',
  'ven_item_utilidad_nombre',
] as const satisfies readonly ConfiguracionCampo[];

// ── Área Empresa (datos de la empresa) ────────────────────────────────────────

/**
 * Campos de los datos de empresa. Los piden sus dos hogares: la página «Mi
 * empresa» (`/t/:slug/empresa`) y el paso «Datos de la empresa» del asistente de
 * facturación electrónica.
 */
export const EMPRESA_CAMPOS = [
  'gen_empresa_razon_social',
  'gen_empresa_nombre_corto',
  'gen_empresa_tipo_persona',
  'gen_empresa_identificacion',
  'gen_empresa_numero_identificacion',
  'gen_empresa_digito_verificacion',
  'gen_empresa_direccion',
  'gen_empresa_ciudad',
  'gen_empresa_telefono',
  'gen_empresa_correo',
] as const satisfies readonly ConfiguracionCampo[];
