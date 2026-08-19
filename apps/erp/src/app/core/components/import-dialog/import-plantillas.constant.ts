/**
 * Host de las **plantillas de importación** que no sirve el backend.
 *
 * Son los XLSX de ejemplo que el ERP anterior dejó publicados: el archivo vacío
 * con las columnas correctas para armar una importación. Viven en el mismo
 * bucket que los maestros, en otra carpeta.
 *
 * La alternativa buena es que el backend las exponga en un `…/importar-ejemplo/`
 * —como ya hace con contactos o cuentas—, porque así la plantilla puede traer
 * datos del tenant. Mientras no exista para un recurso, se apunta acá y el
 * diálogo la ofrece con `{ mode: 'external', url }`.
 */
const PLANTILLAS_BASE_URL = 'https://semantica.sfo3.digitaloceanspaces.com/renio/ejemplos';

/**
 * Plantillas publicadas, por recurso.
 *
 * Solo se declaran las que alguna pantalla usa: una URL sin consumidor no se
 * puede verificar y envejece sin que nadie lo note. El ERP anterior publica
 * varias más para las líneas de documento; entran acá cuando esas pantallas
 * importen.
 */
export const IMPORT_PLANTILLA = {
  precioDetalle: `${PLANTILLAS_BASE_URL}/Importar_detalle_precio.xlsx`,
} as const;
