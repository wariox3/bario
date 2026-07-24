/**
 * Endpoints `seleccionar` de catálogos compartidos entre formularios del ERP.
 *
 * Única fuente de verdad para los endpoints de autocomplete/select que se usan en
 * más de un formulario (o que ya tenían una constante suelta). Los componentes
 * `<app-api-select>` / `<app-api-autocomplete>` los consumen vía `[endpoint]`.
 *
 * Alcance: sólo catálogos cross-form (`/general/*`, `centro-costo` y los `/humano/*`
 * que se compartan, p. ej. `novedad-tipo` en novedad + turno). Los endpoints que
 * sólo aparecen en un único formulario se dejan inline en su template —
 * centralizarlos no quita duplicación.
 */
export const SELECT_ENDPOINTS = {
  ciudad: '/general/ciudad/seleccionar/',
  identificacion: '/general/identificacion/seleccionar/',
  tipoPersona: '/general/tipo-persona/seleccionar/',
  responsabilidad: '/general/responsabilidad/seleccionar/',
  plazoPago: '/general/plazo-pago/seleccionar/',
  metodoPago: '/general/metodo-pago/seleccionar/',
  precio: '/general/precio/seleccionar/',
  asesor: '/general/asesor/seleccionar/',
  banco: '/general/banco/seleccionar/',
  cuentaBancoClase: '/general/cuenta-banco-clase/seleccionar/',
  centroCosto: '/contabilidad/centro-costo/seleccionar/',
  novedadTipo: '/humano/novedad-tipo/seleccionar/',
} as const;
