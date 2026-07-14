/**
 * Modelo del master **Prototipo** (administrador de solo lectura).
 *
 * El prototipo es la misma entidad que consume el modal de la programación
 * (`movimientos/programacion`), así que se reexporta su read-model en vez de
 * duplicarlo. El master solo lista y muestra el detalle; no crea ni edita.
 */
export type { Prototipo } from '../../movimientos/programacion/prototipo.model';
