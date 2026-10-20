import type { ErpSelectOption } from '@reddoc/core';

/** `código - nombre`, o vacío si no hay cuenta asignada. */
export function cuentaLabel(codigo: string | null, nombre: string | null): string {
  return [codigo, nombre].filter(Boolean).join(' - ');
}

/**
 * Siembra una cuenta guardada con la etiqueta `código - nombre`, la misma que
 * arma `app-cuenta-select`: el autocomplete abre con el valor puesto sin ir al
 * servidor a resolverlo.
 */
export function cuentaOption(
  id: number | null,
  codigo: string | null,
  nombre: string | null,
): ErpSelectOption | null {
  if (id == null) return null;
  return { id, nombre: cuentaLabel(codigo, nombre), codigo: codigo ?? '' };
}

/**
 * Copia de la opción con otra referencia. Sirve para que un `[ngModel]` vuelva a
 * escribir el valor guardado en un selector que la persona vació: con la misma
 * referencia el binding no cambia y `writeValue` no corre.
 */
export function copiaCuentaOption(option: ErpSelectOption | null): ErpSelectOption | null {
  return option ? { ...option } : null;
}
