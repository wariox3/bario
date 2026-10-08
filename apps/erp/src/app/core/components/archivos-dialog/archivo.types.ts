import type { ModeloId } from '@erp/core/permissions';

/**
 * Archivo adjunto tal como lo sirve `general/archivo/`.
 *
 * El recurso devuelve más campos de los que la ficha usa —`archivo_tipo_codigo`,
 * `modelo_app`, `modelo_clase`, `almacenamiento_id`, `uuid`—; acá viven solo los
 * que el diálogo muestra o necesita para operar. Sumar uno es agregarlo cuando
 * haya una pantalla que lo pinte.
 */
export interface Archivo {
  readonly id: number;
  /** Fecha de carga en ISO. */
  readonly fecha: string;
  readonly nombre: string;
  /** Extensión o mime que reporta el backend. */
  readonly tipo: string | null;
  /** Tamaño en bytes. */
  readonly tamano: number;
  /**
   * Dónde está el archivo en el almacenamiento. El diálogo **no** enlaza acá
   * para descargar —eso va por `general/archivo/<id>/descargar/`, que sí
   * viaja autenticado y con `X-Tenant`—; queda por si alguna pantalla
   * necesita la ubicación (previsualizar una imagen, por ejemplo).
   */
  readonly url: string;
}

/**
 * A qué registro pertenece un archivo.
 *
 * El backend lo identifica con dos datos: el **modelo** (id de `gen_modelo`) y
 * el **id del registro** dentro de ese modelo. Es la misma numeración que ya
 * usan los permisos, así que el dueño se declara con el catálogo `MODELO` en vez
 * de con un string suelto:
 *
 * ```ts
 * { modelo: MODELO.general.contacto, objetoId: contacto.id }
 * ```
 *
 * Un documento no es un caso aparte: es el modelo `general.documento` con su id.
 */
export interface ArchivoOwner {
  /** Id de `gen_modelo`. Ver el catálogo `MODELO`. */
  readonly modelo: ModeloId;
  /** Id del registro dueño, dentro de ese modelo. */
  readonly objetoId: number | string;
}
