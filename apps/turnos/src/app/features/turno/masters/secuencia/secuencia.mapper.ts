import type { Secuencia, SecuenciaPayload } from './secuencia.model';
import type { SecuenciaFormRawValue } from './pages/secuencia-form/secuencia-form.types';

/**
 * Campos de texto por día (días del mes + días de semana + festivos). Comparten
 * el mismo shape `string | null` en el modelo, el form y el payload, así que se
 * mapean en bucle en vez de enumerar 40 asignaciones idénticas.
 */
const DAY_FIELDS = [
  'dia_1',
  'dia_2',
  'dia_3',
  'dia_4',
  'dia_5',
  'dia_6',
  'dia_7',
  'dia_8',
  'dia_9',
  'dia_10',
  'dia_11',
  'dia_12',
  'dia_13',
  'dia_14',
  'dia_15',
  'dia_16',
  'dia_17',
  'dia_18',
  'dia_19',
  'dia_20',
  'dia_21',
  'dia_22',
  'dia_23',
  'dia_24',
  'dia_25',
  'dia_26',
  'dia_27',
  'dia_28',
  'dia_29',
  'dia_30',
  'dia_31',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
  'festivo',
  'domingo_festivo',
] as const;

type DayField = (typeof DAY_FIELDS)[number];

export function secuenciaToFormValue(s: Secuencia): Partial<SecuenciaFormRawValue> {
  const days = {} as Record<DayField, string>;
  for (const f of DAY_FIELDS) days[f] = s[f] ?? '';
  return {
    nombre: s.nombre,
    dias: s.dias,
    homologar: s.homologar,
    ...days,
  };
}

export function formValueToPayload(v: SecuenciaFormRawValue): SecuenciaPayload {
  const days = {} as Record<DayField, string | null>;
  for (const f of DAY_FIELDS) days[f] = v[f] || null;
  return {
    nombre: v.nombre ?? '',
    dias: v.dias ?? null,
    homologar: v.homologar,
    ...days,
  };
}
