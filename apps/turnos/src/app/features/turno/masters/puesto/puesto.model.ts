/**
 * Puesto: lugar físico de trabajo dentro del módulo de turnos (tiene dirección,
 * coordenadas y referencias a ciudad, centro de costo, contacto y programador).
 *
 * Shape de lectura de `POST /turno/puesto/lista/` y `GET /turno/puesto/:id/`. Los
 * relacionales viajan con el id "pelado" en el campo base (`ciudad`, `contacto`,
 * `centro_costo`, `programador`) y el getById acompaña cada uno con su
 * `<campo>_nombre` legible. `latitud`/`longitud` llegan como string por la
 * serialización Decimal de Django.
 */
export interface Puesto {
  readonly id: number;
  readonly nombre: string;
  readonly direccion: string | null;
  readonly celular: string | null;
  readonly latitud: string | null;
  readonly longitud: string | null;
  readonly comentario: string | null;
  readonly estado_inactivo: boolean;
  readonly centro_costo: number | null;
  readonly ciudad: number | null;
  readonly contacto: number | null;
  readonly programador: number | null;
  /** Nombre legible del FK ciudad — presente en la respuesta de getById(). */
  readonly ciudad_nombre?: string | null;
  /** Nombre legible del FK contacto — presente en la respuesta de getById(). */
  readonly contacto_nombre?: string | null;
  /** Nombre legible del FK centro de costo — presente en la respuesta de getById(). */
  readonly centro_costo_nombre?: string | null;
  /** Nombre legible del FK programador — presente en la respuesta de getById(). */
  readonly programador_nombre?: string | null;
}

/** Write-model para create/update de puesto. */
export interface PuestoPayload {
  nombre: string;
  direccion: string | null;
  celular: string | null;
  latitud: string | null;
  longitud: string | null;
  comentario: string | null;
  ciudad: number | null;
  contacto: number | null;
  centro_costo: number | null;
  programador: number | null;
}
