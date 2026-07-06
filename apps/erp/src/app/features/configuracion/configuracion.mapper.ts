import { toFiniteNumber } from '@reddoc/core';
import type { ErpSelectOption } from '@reddoc/core';
import type { ConfiguracionPayload, ConfiguracionRead } from './configuracion.model';

/** Opción mínima para precargar un select por id (el label lo resuelve el `dataKey`). */
function optionFromId(id: number | null | undefined): ErpSelectOption | null {
  return id != null ? { id, nombre: '' } : null;
}

// ── Área General (UVT) ────────────────────────────────────────────────────────

export interface GeneralConfigFormValue {
  readonly uvt: number | null;
}

export function configuracionToGeneralForm(
  config: Partial<ConfiguracionRead>,
): GeneralConfigFormValue {
  return { uvt: toFiniteNumber(config.gen_uvt) };
}

export function generalFormToPayload(form: GeneralConfigFormValue): ConfiguracionPayload {
  return { gen_uvt: form.uvt };
}

// ── Área Humano ───────────────────────────────────────────────────────────────

export interface HumanoConfigFormValue {
  readonly salario_minimo: number | null;
  readonly factor: number | null;
  readonly auxilio_transporte: number | null;
}

export function configuracionToHumanoForm(
  config: Partial<ConfiguracionRead>,
): HumanoConfigFormValue {
  return {
    salario_minimo: toFiniteNumber(config.hum_salario_minimo),
    factor: toFiniteNumber(config.hum_factor),
    auxilio_transporte: toFiniteNumber(config.hum_auxilio_transporte),
  };
}

export function humanoFormToPayload(form: HumanoConfigFormValue): ConfiguracionPayload {
  return {
    hum_salario_minimo: form.salario_minimo,
    hum_factor: form.factor,
    hum_auxilio_transporte: form.auxilio_transporte,
  };
}

// ── Área Empresa (datos de la empresa) — PARQUEADA (sin pestaña por ahora) ──────

export interface EmpresaConfigFormValue {
  readonly nombre_corto: string;
  readonly tipo_persona: ErpSelectOption | null;
  readonly identificacion: ErpSelectOption | null;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string;
  readonly direccion: string;
  readonly ciudad: ErpSelectOption | null;
  readonly telefono: string;
  readonly correo: string;
}

export function configuracionToEmpresaForm(
  config: Partial<ConfiguracionRead>,
): EmpresaConfigFormValue {
  return {
    nombre_corto: config.gen_empresa_nombre_corto ?? '',
    tipo_persona: optionFromId(config.gen_empresa_tipo_persona_id),
    identificacion: optionFromId(config.gen_empresa_identificacion_id),
    numero_identificacion: config.gen_empresa_numero_identificacion ?? '',
    digito_verificacion: config.gen_empresa_digito_verificacion ?? '',
    direccion: config.gen_empresa_direccion ?? '',
    ciudad: optionFromId(config.gen_empresa_ciudad_id),
    telefono: config.gen_empresa_telefono ?? '',
    correo: config.gen_empresa_correo ?? '',
  };
}

export function empresaFormToPayload(form: EmpresaConfigFormValue): ConfiguracionPayload {
  return {
    gen_empresa_nombre_corto: form.nombre_corto.trim() || null,
    gen_empresa_tipo_persona_id: form.tipo_persona?.id ?? null,
    gen_empresa_identificacion_id: form.identificacion?.id ?? null,
    gen_empresa_numero_identificacion: form.numero_identificacion.trim() || null,
    gen_empresa_digito_verificacion: form.digito_verificacion.trim() || null,
    gen_empresa_direccion: form.direccion.trim() || null,
    gen_empresa_ciudad_id: form.ciudad?.id ?? null,
    gen_empresa_telefono: form.telefono.trim() || null,
    gen_empresa_correo: form.correo.trim() || null,
  };
}
