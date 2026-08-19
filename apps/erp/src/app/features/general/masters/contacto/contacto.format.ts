import type { Contacto } from './contacto.model';
import { TIPO_PERSONA } from './contacto.constants';

/**
 * Formato de lectura de un contacto, compartido por las fichas que lo muestran.
 *
 * Vive acá y no en un componente porque **el empleado es un contacto** (mismo
 * recurso, mismo modelo, distinta presentación) y su ficha necesita exactamente
 * estas tres lecturas. Duplicarlas garantizaría que dentro de unos meses una se
 * corrija y la otra no.
 *
 * Todas concatenan **en TypeScript**, nunca con interpolaciones vecinas en el
 * template: al formatear, prettier las parte en líneas distintas y el colapso de
 * espacios mete un blanco de más (`1118260345 -1`).
 */

/** Une las partes con valor descartando nulos y vacíos; '' si no queda ninguna. */
function unirPartes(partes: readonly (string | null | undefined)[], separador: string): string {
  return partes
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => !!parte)
    .join(separador);
}

/**
 * Número de identificación con su dígito de verificación: `900123456-7`.
 *
 * El DV es el checksum módulo-11 del **NIT**: una cédula no lo tiene. En persona
 * natural no se pinta aunque el registro lo traiga — el formulario calcula el DV
 * a partir del número sin mirar el tipo de persona y lo persiste
 * (`contacto.mapper.ts`), así que hay contactos naturales con un DV guardado que
 * no les corresponde. Acá solo se deja de mostrar; limpiar lo guardado es tarea
 * del backend.
 */
export function numeroDocumentoDe(contacto: Contacto): string {
  if (!contacto.numero_identificacion) return '';
  const dv = contacto.tipo_persona === TIPO_PERSONA.NATURAL ? null : contacto.digito_verificacion;
  return dv ? `${contacto.numero_identificacion}-${dv}` : contacto.numero_identificacion;
}

/**
 * Nombre completo en una sola línea. Las partes desglosadas solo llegan en
 * persona natural; en jurídica el nombre real es `nombre_corto`, así que cae ahí
 * — si no, la ficha de una empresa no mostraría su nombre en ningún lado.
 */
export function nombreCompletoDe(contacto: Contacto): string {
  return (
    unirPartes([contacto.nombre1, contacto.nombre2, contacto.apellido1, contacto.apellido2], ' ') ||
    contacto.nombre_corto ||
    ''
  );
}

/**
 * Ubicación como **bloque de sobre** en vez de cuatro campos sueltos: calle y
 * barrio arriba, ciudad/departamento y código postal abajo. Se arma acá para que
 * el template no encadene un `@if` por cada separador; ahí el «—» aplica al
 * bloque entero, no a cada parte.
 */
export function direccionLineasDe(contacto: Contacto): readonly string[] {
  const ciudad = unirPartes([contacto.ciudad_nombre, contacto.departamento_nombre], ' — ');
  return [
    unirPartes([contacto.direccion, contacto.barrio], ' · '),
    unirPartes([ciudad, contacto.codigo_postal], ' · '),
  ].filter((linea) => !!linea);
}
