import type { DocumentoEstados } from '@reddoc/core';

/**
 * Severidad visual de un badge de estado. La ficha la traduce a clases Tailwind:
 * `positive` → afirmativo (aprobado, contabilizado…); `pending` → en curso
 * (enviado a la DIAN sin respuesta aún); `danger` → terminal negativo (anulado).
 */
export type EstadoSeverity = 'positive' | 'pending' | 'danger';

/** Un badge ya resuelto: qué texto pintar y con qué severidad. */
export interface EstadoBadge {
  readonly key: string;
  readonly label: string;
  readonly severity: EstadoSeverity;
}

/** Etiquetas i18n de los estados (slice de `documentActions.estados`). */
export interface EstadoLabels {
  readonly aprobado: string;
  readonly contabilizado: string;
  readonly electronico: string;
  readonly enviadoDian: string;
  readonly notificado: string;
  readonly generado: string;
  readonly anulado: string;
}

/**
 * Deriva la fila de badges a mostrar en la ficha a partir de las banderas de
 * estado del documento. Función **pura** (sin Angular): solo aparece el badge
 * cuya bandera es verdadera, en un orden fijo pensado como línea de tiempo del
 * ciclo de vida — primero lo generado/aprobado/contable, luego el tramo
 * electrónico DIAN, y `anulado` al final por ser el estado terminal.
 *
 * "Enviado DIAN (esperando respuesta)" es una condición **compuesta**: enviado a
 * la DIAN pero todavía sin aceptación electrónica (`estado_electronico` falso).
 * Cuando la DIAN acepta, ese badge desaparece y lo reemplaza "Electrónico".
 */
export function deriveEstadoBadges(
  estados: DocumentoEstados,
  labels: EstadoLabels,
): readonly EstadoBadge[] {
  const badges: EstadoBadge[] = [];

  if (estados.estado_generado) {
    badges.push({ key: 'generado', label: labels.generado, severity: 'positive' });
  }
  if (estados.estado_aprobado) {
    badges.push({ key: 'aprobado', label: labels.aprobado, severity: 'positive' });
  }
  if (estados.estado_contabilizado) {
    badges.push({ key: 'contabilizado', label: labels.contabilizado, severity: 'positive' });
  }
  if (estados.estado_electronico) {
    badges.push({ key: 'electronico', label: labels.electronico, severity: 'positive' });
  } else if (estados.estado_electronico_enviado) {
    // Enviado a la DIAN pero aún sin aceptación electrónica → en curso.
    badges.push({ key: 'enviadoDian', label: labels.enviadoDian, severity: 'pending' });
  }
  if (estados.estado_electronico_notificado) {
    badges.push({ key: 'notificado', label: labels.notificado, severity: 'positive' });
  }
  if (estados.estado_anulado) {
    badges.push({ key: 'anulado', label: labels.anulado, severity: 'danger' });
  }

  return badges;
}
