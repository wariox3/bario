/**
 * Turno: jornada de trabajo del módulo Turno. Define el horario (`hora_inicio`,
 * `hora_fin`), las horas calculadas (totales, diurnas y nocturnas), un color para
 * identificarlo visualmente, su código, el tipo de novedad asociado y si está
 * inactivo.
 *
 * Shape de lectura de `POST /turno/turno/lista/` y `GET /turno/turno/:id/`.
 * `hora_inicio`/`hora_fin` viajan como string (`HH:MM` o `HH:MM:SS`) y `color`
 * como string hex (`#RRGGBB`). La FK `novedad_tipo` llega como id pelado más su
 * `*_nombre` para etiquetar el selector al cargar en edición.
 */
export interface Turno {
  readonly id: number;
  readonly nombre: string;
  readonly codigo: string;
  readonly hora_inicio: string | null;
  readonly hora_fin: string | null;
  readonly horas: number | null;
  readonly horas_diurnas: number | null;
  readonly horas_nocturnas: number | null;
  readonly color: string | null;
  readonly novedad_tipo: number | null;
  readonly novedad_tipo_nombre: string | null;
  readonly descanso: boolean;
  readonly estado_inactivo: boolean;
}

/** Write-model para create/update de turno. */
export interface TurnoPayload {
  nombre: string;
  codigo: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  horas: number | null;
  horas_diurnas: number | null;
  horas_nocturnas: number | null;
  color: string | null;
  novedad_tipo: number | null;
  descanso: boolean;
  estado_inactivo: boolean;
}
