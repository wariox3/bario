import type { ErpSelectOption } from '../data/erp-select-data.service';
import { buildContactoLabel } from '../data/contacto-option';
import type { DocumentoReadBase } from './documento.types';

/**
 * Campos del read de un documento que describen su contacto. Es un `Pick` para
 * que cualquier read-model que extienda `DocumentoReadBase` encaje sin castear.
 */
export type DocumentoContactoRead = Pick<
  DocumentoReadBase,
  'contacto' | 'contacto_nombre_corto' | 'contacto_numero_identificacion' | 'contacto_precio_id'
>;

/**
 * Read de un documento → valor del campo contacto del formulario.
 *
 * Todos los mappers de documento (`<documento>ToFormValue`) siembran el
 * autocomplete de contacto con esto, así la etiqueta que se ve al abrir un
 * documento en edición es la misma `identificación - nombre` que arma
 * `lib-contacto-select` al elegir uno — antes se veía solo el nombre.
 *
 * La opción también carga `precio_id`, la lista de precios del contacto, con la
 * misma clave que trae `contacto/seleccionar/`: así `precioListaDeContacto`
 * lee lo mismo venga el contacto del autocomplete o del documento en edición, y
 * un ítem agregado al editar se cotiza contra la lista del cliente.
 *
 * Devuelve `null` cuando el documento no tiene contacto.
 */
export function documentoContactoToOption(read: DocumentoContactoRead): ErpSelectOption | null {
  if (read.contacto == null) return null;
  return {
    id: read.contacto,
    nombre: buildContactoLabel(read.contacto_numero_identificacion, read.contacto_nombre_corto),
    precio_id: read.contacto_precio_id ?? null,
  };
}
