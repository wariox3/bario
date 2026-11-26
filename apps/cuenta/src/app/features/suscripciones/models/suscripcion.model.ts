export interface Suscripcion {
  readonly id: number;
  readonly cliente: number;
  readonly cliente_nombre: string;
  readonly usuario: number;
  readonly suscripcion_tipo: number;
  readonly suscripcion_tipo_nombre: string;
  /** Precio de lista del tipo. Es el que cobra la clase Contador. */
  readonly suscripcion_tipo_precio: string | null;
  readonly suscripcion_tipo_suscripcion_clase_id: number | null;
  readonly suscripcion_tipo_suscripcion_categoria_id: number | null;
  readonly fecha_inicio: string;
  readonly fecha_fin: string;
  readonly frecuencia: string;
  /** Precio acordado de esta suscripción. Es el que cobra la clase Personalizado. */
  readonly precio: string;
}
