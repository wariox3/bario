import type { ErpSelectOption } from '@reddoc/core';
import type { DocumentoTipo, DocumentoTipoPayload, DocumentoTipoRow } from './documento-tipo.model';

/** `código - nombre`, o vacío si no hay cuenta asignada. */
function cuentaLabel(codigo: string | null, nombre: string | null): string {
  return [codigo, nombre].filter(Boolean).join(' - ');
}

/**
 * Fila del backend → fila de la tabla.
 *
 * Las cuentas se aplanan a una sola etiqueta acá y no con una columna
 * `combined`: esa pinta el separador aunque las dos partes vengan vacías, y un
 * tipo sin cuenta asignada terminaría mostrando un guion suelto.
 */
export function toDocumentoTipoRow(tipo: DocumentoTipo): DocumentoTipoRow {
  return {
    ...tipo,
    cuenta_cobrar_label: cuentaLabel(tipo.cuenta_cobrar_codigo, tipo.cuenta_cobrar_nombre),
    cuenta_pagar_label: cuentaLabel(tipo.cuenta_pagar_codigo, tipo.cuenta_pagar_nombre),
  };
}

/**
 * Valor del formulario de edición: solo lo que el backend acepta escribir.
 *
 * `consecutivo` va `number` y no `number | null` a propósito: el control sí
 * admite nulo mientras se escribe, pero el payload no, y tipándolo acá el
 * compilador obliga a resolver ese nulo en el submit en vez de dejar que el
 * mapper invente un valor.
 */
export interface DocumentoTipoFormValue {
  readonly consecutivo: number;
  readonly resolucion: ErpSelectOption | null;
  readonly cuenta_cobrar: ErpSelectOption | null;
  readonly cuenta_pagar: ErpSelectOption | null;
}

/**
 * Opción sembrada de la resolución guardada.
 *
 * Lleva `prefijo` y `numero` sueltos además del `nombre` compuesto porque el
 * desplegable arma su etiqueta con esos dos campos: sin ellos, el valor ya
 * elegido se vería en blanco hasta que termine de cargar el catálogo.
 */
function resolucionOption(tipo: DocumentoTipo): ErpSelectOption | null {
  if (tipo.resolucion == null) return null;
  const prefijo = tipo.resolucion_prefijo ?? '';
  const numero = tipo.resolucion_numero ?? '';
  const label = [prefijo, numero].filter(Boolean).join(' ');
  return { id: tipo.resolucion, nombre: label || `#${tipo.resolucion}`, prefijo, numero };
}

/**
 * Arma la opción de cuenta con la etiqueta `código - nombre`, que es la misma
 * convención que produce `app-cuenta-select`. Así el autocomplete abre con el
 * valor puesto sin ir al servidor a resolver el label.
 */
function cuentaOption(
  id: number | null,
  codigo: string | null,
  nombre: string | null,
): ErpSelectOption | null {
  if (id == null) return null;
  return { id, nombre: cuentaLabel(codigo, nombre) || nombre || '', codigo: codigo ?? '' };
}

export function documentoTipoToForm(tipo: DocumentoTipo): DocumentoTipoFormValue {
  return {
    consecutivo: tipo.consecutivo,
    resolucion: resolucionOption(tipo),
    cuenta_cobrar: cuentaOption(
      tipo.cuenta_cobrar,
      tipo.cuenta_cobrar_codigo,
      tipo.cuenta_cobrar_nombre,
    ),
    cuenta_pagar: cuentaOption(
      tipo.cuenta_pagar,
      tipo.cuenta_pagar_codigo,
      tipo.cuenta_pagar_nombre,
    ),
  };
}

/**
 * Vaciar un campo de cuenta manda `null`, que es como el backend borra la
 * contrapartida: omitir la clave en un PATCH la dejaría como estaba.
 */
export function documentoTipoFormToPayload(form: DocumentoTipoFormValue): DocumentoTipoPayload {
  return {
    consecutivo: form.consecutivo,
    resolucion: form.resolucion?.id ?? null,
    cuenta_cobrar: form.cuenta_cobrar?.id ?? null,
    cuenta_pagar: form.cuenta_pagar?.id ?? null,
  };
}
