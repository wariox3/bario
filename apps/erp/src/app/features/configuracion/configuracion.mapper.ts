import { toFiniteNumber } from '@reddoc/core';
import type { Ciudad, ErpSelectOption } from '@reddoc/core';
import type { ConfiguracionPayload, ConfiguracionRead } from './configuracion.model';

/** Opción mínima para precargar un select por id (el label lo resuelve el `dataKey`). */
function optionFromId(id: number | null | undefined): ErpSelectOption | null {
  return id != null ? { id, nombre: '' } : null;
}

// ── Área General (UVT) ────────────────────────────────────────────────────────

export interface GeneralConfigFormValue {
  readonly uvt: number | null;
  readonly emitir_automaticamente: boolean;
}

export function configuracionToGeneralForm(
  config: Partial<ConfiguracionRead>,
): GeneralConfigFormValue {
  return {
    uvt: toFiniteNumber(config.gen_uvt),
    emitir_automaticamente: config.gen_emitir_automaticamente ?? false,
  };
}

export function generalFormToPayload(form: GeneralConfigFormValue): ConfiguracionPayload {
  return {
    gen_uvt: form.uvt,
    gen_emitir_automaticamente: form.emitir_automaticamente,
  };
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

// ── Área Empresa (datos de la empresa) ────────────────────────────────────────

export interface EmpresaConfigFormValue {
  readonly razon_social: string;
  readonly nombre_corto: string;
  readonly tipo_persona: ErpSelectOption | null;
  readonly identificacion: ErpSelectOption | null;
  readonly numero_identificacion: string;
  readonly digito_verificacion: string;
  readonly direccion: string;
  readonly ciudad: Ciudad | null;
  readonly telefono: string;
  readonly correo: string;
}

/**
 * `ciudad` llega por separado porque la configuración solo guarda su id, y
 * resolverlo cuesta una petición al catálogo (`CiudadService.byId`). Sin ella el
 * campo conserva el id igual —guardar sin tocarlo no la borra— pero el
 * autocomplete abre en blanco: arma su etiqueta desde el propio valor.
 */
export function configuracionToEmpresaForm(
  config: Partial<ConfiguracionRead>,
  ciudad?: Ciudad | null,
): EmpresaConfigFormValue {
  return {
    razon_social: config.gen_empresa_razon_social ?? '',
    nombre_corto: config.gen_empresa_nombre_corto ?? '',
    tipo_persona: optionFromId(config.gen_empresa_tipo_persona),
    identificacion: optionFromId(config.gen_empresa_identificacion),
    numero_identificacion: config.gen_empresa_numero_identificacion ?? '',
    digito_verificacion: config.gen_empresa_digito_verificacion ?? '',
    direccion: config.gen_empresa_direccion ?? '',
    ciudad:
      ciudad ??
      (config.gen_empresa_ciudad != null ? { id: config.gen_empresa_ciudad, nombre: '' } : null),
    telefono: config.gen_empresa_telefono ?? '',
    correo: config.gen_empresa_correo ?? '',
  };
}

export function empresaFormToPayload(form: EmpresaConfigFormValue): ConfiguracionPayload {
  return {
    gen_empresa_razon_social: form.razon_social.trim() || null,
    // Sin `|| null` como sus vecinos: la columna no es nulable en el schema del
    // contenedor, así que un nulo vuelve como 400. En blanco no llega —el campo
    // es obligatorio— pero el payload no depende de esa suerte.
    gen_empresa_nombre_corto: form.nombre_corto.trim(),
    gen_empresa_tipo_persona: form.tipo_persona?.id ?? null,
    gen_empresa_identificacion: form.identificacion?.id ?? null,
    gen_empresa_numero_identificacion: form.numero_identificacion.trim() || null,
    gen_empresa_digito_verificacion: form.digito_verificacion.trim() || null,
    gen_empresa_direccion: form.direccion.trim() || null,
    gen_empresa_ciudad: form.ciudad?.id ?? null,
    gen_empresa_telefono: form.telefono.trim() || null,
    gen_empresa_correo: form.correo.trim() || null,
  };
}
