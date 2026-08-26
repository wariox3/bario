import type { ImportMaster, ImportMasterId } from './import-dialog.types';

/**
 * Host de los XLSX de maestros. Son archivos **públicos y globales** (iguales
 * para todos los tenants): catálogos oficiales — códigos DANE de ciudades,
 * comprobantes contables, tipos de cotizante — que el backend no sirve porque no
 * son datos del tenant.
 *
 * Aislado en una constante para que mudar el bucket sea un cambio de una línea.
 */
const MAESTROS_BASE_URL = 'https://semantica.sfo3.digitaloceanspaces.com/renio/maestros';

/**
 * Catálogo de **maestros**: los archivos de referencia que acompañan a una
 * importación.
 *
 * No son plantillas de carga (eso es el botón "Descargar ejemplo" del diálogo,
 * que pega contra `…/importar-ejemplo/` del backend). Son tablas de consulta: el
 * usuario baja `gen_ciudades.xlsx` para saber qué código escribir en la columna
 * `ciudad` de su archivo. Por eso el diálogo los ofrece **antes** de importar.
 *
 * Cada lista declara los maestros que su archivo necesita — el libro contable no
 * tiene por qué ofrecer "Método depreciación":
 *
 * ```ts
 * // movimiento.constants.ts
 * export const MOVIMIENTO_IMPORT_MASTERS: readonly ImportMaster[] = [
 *   IMPORT_MASTER.comprobanteCodigo,
 *   IMPORT_MASTER.comprobante,
 * ];
 * ```
 *
 * Los listados transversales, cuyo archivo puede pedir cualquier catálogo, usan
 * `IMPORT_MASTERS_ALL` (ver abajo). En ambos casos el consumidor lo pasa por el
 * `masters` de `importState()`.
 *
 * `satisfies` fuerza que estén los 13 ids y que ninguna entrada mienta sobre el
 * suyo; los nombres visibles viven en `common.import.masters.names`.
 */
export const IMPORT_MASTER = {
  ciudad: { id: 'ciudad', url: `${MAESTROS_BASE_URL}/gen_ciudades.xlsx` },
  comprobanteCodigo: { id: 'comprobanteCodigo', url: `${MAESTROS_BASE_URL}/con_comprobante.xlsx` },
  comprobante: { id: 'comprobante', url: `${MAESTROS_BASE_URL}/comprobante.xlsx` },
  impuesto: { id: 'impuesto', url: `${MAESTROS_BASE_URL}/impuestos.xlsx` },
  banco: { id: 'banco', url: `${MAESTROS_BASE_URL}/gen_banco.xlsx` },
  cuentaBancoClase: {
    id: 'cuentaBancoClase',
    url: `${MAESTROS_BASE_URL}/gen_cuenta_banco_clase.xlsx`,
  },
  activoGrupo: { id: 'activoGrupo', url: `${MAESTROS_BASE_URL}/con_activo_grupo.xlsx` },
  metodoDepreciacion: {
    id: 'metodoDepreciacion',
    url: `${MAESTROS_BASE_URL}/con_metodo_depreciacion.xlsx`,
  },
  tipoCotizante: { id: 'tipoCotizante', url: `${MAESTROS_BASE_URL}/hum_tipo_cotizante.xlsx` },
  subtipoCotizante: {
    id: 'subtipoCotizante',
    url: `${MAESTROS_BASE_URL}/hum_subtipo_cotizante.xlsx`,
  },
  entidad: { id: 'entidad', url: `${MAESTROS_BASE_URL}/hum_entidad.xlsx` },
  tipoContrato: { id: 'tipoContrato', url: `${MAESTROS_BASE_URL}/hum_contrato_tipo.xlsx` },
  costoTipo: { id: 'costoTipo', url: `${MAESTROS_BASE_URL}/hum_costo_tipo.xlsx` },
} as const satisfies Record<ImportMasterId, ImportMaster>;

/**
 * **Todos** los maestros, en el orden de declaración.
 *
 * Para los listados cuyo archivo cruza medio ERP y no admite una lista corta —el
 * contacto es cliente, proveedor y empleado a la vez, así que su Excel puede pedir
 * tanto la ciudad como el tipo de cotizante o el tipo de contrato—. El resto de
 * los listados declara los suyos uno por uno: ofrecer trece archivos donde hacen
 * falta dos no ayuda a nadie.
 */
export const IMPORT_MASTERS_ALL: readonly ImportMaster[] = Object.values(IMPORT_MASTER);
