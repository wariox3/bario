import type { Turno, TurnoPayload } from './turno.model';
import type { TurnoFormRawValue } from './pages/turno-form/turno-form.types';

/** Color por defecto cuando el turno aún no tiene uno (el picker no admite vacío). */
const DEFAULT_COLOR = '#143049';

/**
 * Hora por defecto para turnos sin jornada (ej: "Descanso"). El backend exige
 * `hora_inicio`/`hora_fin` no-nulos, así que un turno sin horario va con 00:00.
 */
const DEFAULT_HORA = '00:00';

export function turnoToFormValue(t: Turno): Partial<TurnoFormRawValue> {
  return {
    codigo: t.codigo,
    nombre: t.nombre,
    hora_inicio: t.hora_inicio ?? '',
    hora_fin: t.hora_fin ?? '',
    horas: t.horas,
    horas_diurnas: t.horas_diurnas,
    horas_nocturnas: t.horas_nocturnas,
    color: t.color ?? DEFAULT_COLOR,
    novedad_tipo:
      t.novedad_tipo != null ? { id: t.novedad_tipo, nombre: t.novedad_tipo_nombre ?? '' } : null,
    descanso: t.descanso,
    estado_inactivo: t.estado_inactivo,
  };
}

export function formValueToPayload(v: TurnoFormRawValue): TurnoPayload {
  // El backend exige horario y horas no-nulos; un turno sin jornada (ej:
  // "Descanso") va con horario 00:00 y horas en cero.
  return {
    codigo: v.codigo ?? '',
    nombre: v.nombre ?? '',
    hora_inicio: v.hora_inicio || DEFAULT_HORA,
    hora_fin: v.hora_fin || DEFAULT_HORA,
    horas: v.horas ?? 0,
    horas_diurnas: v.horas_diurnas ?? 0,
    horas_nocturnas: v.horas_nocturnas ?? 0,
    color: v.color || null,
    novedad_tipo: v.novedad_tipo?.id ?? null,
    descanso: v.descanso ?? false,
    estado_inactivo: v.estado_inactivo,
  };
}
