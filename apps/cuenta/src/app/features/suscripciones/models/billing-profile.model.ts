import type { Ciudad, Identificacion } from '@reddoc/core';

/**
 * Shape de vista para el card y el summary. La API devuelve campos crudos
 * (identificacion: number, ciudad: number, etc.); el service mapea a esto
 * usando los objetos `Identificacion`/`Ciudad` que ya tenemos cargados.
 */
export interface BillingProfile {
  readonly id: number;
  readonly tipo: string;
  readonly numero: string;
  readonly nombre: string;
  readonly email: string;
  readonly celular: string;
  readonly direccion: string;
  readonly ciudad: string;
  readonly ciudad_id?: number;
  /**
   * Departamento de la ciudad. Va aparte del nombre —y no pegado en `ciudad`—
   * porque cumple dos papeles: la etiqueta que se lee (`Amagá — Antioquia`) y el
   * `Ciudad` que se rearma al reabrir la edición, donde el nombre debe ir limpio.
   */
  readonly departamento?: string | null;
}

export interface BillingProfileDraft {
  identificacion: Identificacion | null;
  numero: string;
  nombre: string;
  email: string;
  celular: string;
  direccion: string;
  ciudad: Ciudad | null;
}

export const EMPTY_BILLING_DRAFT: BillingProfileDraft = {
  identificacion: null,
  numero: '',
  nombre: '',
  email: '',
  celular: '',
  direccion: '',
  ciudad: null,
};

export interface BillingProfilePayload {
  readonly identificacion: number;
  readonly numero_identificacion: string;
  readonly nombre_corto: string;
  readonly correo: string;
  readonly celular: string;
  readonly direccion: string;
  readonly ciudad: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isBillingDraftValid(draft: BillingProfileDraft): boolean {
  if (!draft.identificacion) return false;
  if (draft.numero.replace(/\D/g, '').length < 5) return false;
  if (draft.nombre.trim().length < 3) return false;
  if (!EMAIL_RE.test(draft.email.trim())) return false;
  if (draft.celular.replace(/\D/g, '').length < 7) return false;
  if (draft.direccion.trim().length < 5) return false;
  if (!draft.ciudad || draft.ciudad.nombre.trim().length < 2) return false;
  return true;
}
