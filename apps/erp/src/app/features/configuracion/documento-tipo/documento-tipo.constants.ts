import type { ColumnDef, SortSpec } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';

/**
 * Columnas de la tabla de tipos de documento.
 *
 * La resolución se muestra pero no se edita: el backend la declara de solo
 * lectura en el PATCH del tipo. Las cuentas leen las etiquetas ya armadas por
 * `toDocumentoTipoRow`, no los campos crudos.
 *
 * **Sobre los anchos:** el encabezado va en versalitas y `nowrap`, así que su
 * texto es el piso real de cada columna —«Consecutivo» pide más que cualquier
 * consecutivo que quepa debajo—. Los anchos están puestos apenas por encima de
 * ese piso para que el espacio sobrante vaya al nombre, que es por donde se
 * busca. Al ser diez columnas la tabla scrollea en horizontal igual; lo que se
 * gana es que el nombre entre completo sin partirse en la parte visible.
 */
export const DOCUMENTO_TIPO_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'id',
    headerKey: 'configuracion.general.documentoTipo.columns.id',
    type: 'number',
    width: '70px',
    align: 'right',
  },
  {
    // La columna que gobierna: es por el nombre que se busca el tipo en la
    // tabla. Se lleva el ancho que las demás no necesitan, y el sobrante del
    // contenedor cae mayormente acá por ser la declaración más grande.
    field: 'nombre',
    headerKey: 'configuracion.general.documentoTipo.columns.nombre',
    type: 'text',
    width: '22rem',
  },
  {
    field: 'consecutivo',
    headerKey: 'configuracion.general.documentoTipo.columns.consecutivo',
    type: 'text',
    width: '104px',
    align: 'right',
  },
  {
    // Los tres campos de la resolución van en columnas propias, como en el ERP
    // anterior: el id identifica el registro y el par prefijo + número es como
    // se la nombra en la DIAN. Todos `text`: son identificadores, no cantidades.
    field: 'resolucion',
    headerKey: 'configuracion.general.documentoTipo.columns.resolucion',
    type: 'text',
    width: '100px',
    align: 'right',
  },
  {
    // Más ancha que prefijo aunque su encabezado sea más corto: el número de
    // resolución de la DIAN son catorce dígitos y partido en dos líneas deja
    // de leerse como un número.
    field: 'resolucion_numero',
    headerKey: 'configuracion.general.documentoTipo.columns.resolucionNumero',
    type: 'text',
    width: '128px',
  },
  {
    field: 'resolucion_prefijo',
    headerKey: 'configuracion.general.documentoTipo.columns.resolucionPrefijo',
    type: 'text',
    width: '88px',
  },
  {
    field: 'venta',
    headerKey: 'configuracion.general.documentoTipo.columns.venta',
    type: 'boolean',
    width: '74px',
    align: 'center',
  },
  {
    field: 'compra',
    headerKey: 'configuracion.general.documentoTipo.columns.compra',
    type: 'boolean',
    width: '82px',
    align: 'center',
  },
  {
    field: 'cuenta_cobrar_label',
    headerKey: 'configuracion.general.documentoTipo.columns.cuentaCobrar',
    type: 'text',
    width: '15rem',
  },
  {
    field: 'cuenta_pagar_label',
    headerKey: 'configuracion.general.documentoTipo.columns.cuentaPagar',
    type: 'text',
    width: '15rem',
  },
];

/** Catálogo de resoluciones que alimenta el selector del modal de edición. */
export const RESOLUCION_SELECCIONAR_ENDPOINT = '/general/resolucion/seleccionar/';

/**
 * Orden **fijo** del listado: el del catálogo.
 *
 * Ninguna columna es ordenable y esto no se cambia desde la UI. Los tipos vienen
 * sembrados por fixture en un orden que la gente ya conoce de memoria.
 *
 * Igual viaja en cada consulta, y no es decorativo: sin un `ORDER BY` explícito
 * la base puede devolver las filas en cualquier orden entre consultas, y una
 * lista paginada así repite filas en una página y se saltea otras.
 */
export const DOCUMENTO_TIPO_SORT: readonly SortSpec[] = [{ field: 'id', direction: 'asc' }];

/**
 * Única acción de fila. Va `inline` porque es la razón de ser de la tabla:
 * esconder el lápiz en un menú de tres puntos agrega un clic a lo único que se
 * puede hacer acá.
 */
export const DOCUMENTO_TIPO_ROW_ACTIONS: readonly RowAction[] = [
  { id: 'edit', labelKey: 'common.actions.edit', iconClass: 'pi pi-pencil', inline: true },
];

/** Alto del cuerpo de la tabla: va embebida en una tarjeta, no llena la página. */
export const DOCUMENTO_TIPO_TABLE_HEIGHT = '26rem';
