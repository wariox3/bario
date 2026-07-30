/**
 * Las **columnas de la línea liquidada**: 42 campos con el desglose PILA de un
 * contrato en el periodo.
 *
 * La tabla se porta literal —con scroll horizontal— porque es la que se compara
 * contra el plano que se le entrega al operador: reagrupar o resumir la haría más
 * bonita y menos auditable.
 *
 * Las columnas salen de **una sola metadata** en vez de escribirse dos veces (una
 * en la tabla y otra en la leyenda, como en el ERP anterior, donde cada sigla
 * vivía en un `ngbTooltip` suelto): de acá se derivan tanto los `ColumnDef` como
 * la lista de abreviaturas que se explica debajo, así que no pueden divergir.
 *
 * Cada entrada apunta a dos claves i18n derivadas de `clave`:
 * - `entities.aporte.detalles.siglas.<clave>` — el encabezado corto.
 * - `entities.aporte.detalles.nombres.<clave>` — el nombre completo, para la leyenda.
 */
import type { ColumnDef, ColumnValueType } from '@reddoc/core';

/** Prefijo i18n del encabezado corto. */
const SIGLA = 'entities.aporte.detalles.siglas';
/** Prefijo i18n del nombre completo. */
const NOMBRE = 'entities.aporte.detalles.nombres';
/** Prefijo i18n de los valores booleanos de novedad (`Sí` / `—`). */
const NOVEDAD = 'entities.aporte.detalles.novedad';

interface DetalleColumnaMeta {
  readonly field: string;
  /** Sufijo compartido por las dos claves i18n. */
  readonly clave: string;
  readonly type: ColumnValueType;
  readonly width: string;
  readonly align?: 'left' | 'right' | 'center';
  /**
   * `true` cuando el encabezado es una abreviatura y necesita explicarse en la
   * leyenda. Las columnas con nombre legible (Id, Empleado, Total) no entran.
   */
  readonly abrevia?: boolean;
}

const META: readonly DetalleColumnaMeta[] = [
  // ── Identificación ────────────────────────────────────────────────────────
  { field: 'id', clave: 'id', type: 'number', width: '80px', align: 'right' },
  {
    field: 'aporte_contrato__contrato__contacto__numero_identificacion',
    clave: 'identificacion',
    type: 'text',
    width: '140px',
  },
  {
    field: 'aporte_contrato__contrato__contacto__nombre_corto',
    clave: 'empleado',
    type: 'text',
    width: '200px',
  },
  { field: 'aporte_contrato', clave: 'contrato', type: 'number', width: '100px', align: 'right' },

  // ── Novedades PILA ────────────────────────────────────────────────────────
  {
    field: 'ingreso',
    clave: 'ing',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  { field: 'retiro', clave: 'ret', type: 'boolean', width: '80px', align: 'center', abrevia: true },
  {
    field: 'variacion_permanente_salario',
    clave: 'vsp',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'variacion_transitoria_salario',
    clave: 'vst',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'suspension_temporal_contrato',
    clave: 'sln',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'incapacidad_general',
    clave: 'ige',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'licencia_maternidad',
    clave: 'lma',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'vacaciones',
    clave: 'vac',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'licencia_remunerada',
    clave: 'lrm',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },
  {
    field: 'dias_incapacidad_laboral',
    clave: 'dIrp',
    type: 'number',
    width: '90px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'salario_integral',
    clave: 'si',
    type: 'boolean',
    width: '80px',
    align: 'center',
    abrevia: true,
  },

  // ── Base del contrato ─────────────────────────────────────────────────────
  {
    field: 'aporte_contrato_salario',
    clave: 'salario',
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  { field: 'horas', clave: 'h', type: 'number', width: '80px', align: 'right', abrevia: true },

  // ── Días por subsistema ───────────────────────────────────────────────────
  {
    field: 'dias_pension',
    clave: 'dP',
    type: 'number',
    width: '80px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'dias_salud',
    clave: 'dS',
    type: 'number',
    width: '80px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'dias_riesgos',
    clave: 'dR',
    type: 'number',
    width: '80px',
    align: 'right',
    abrevia: true,
  },
  { field: 'dias_caja', clave: 'dC', type: 'number', width: '80px', align: 'right', abrevia: true },

  // ── Bases de cotización ───────────────────────────────────────────────────
  {
    field: 'base_cotizacion_pension',
    clave: 'bcP',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'base_cotizacion_salud',
    clave: 'bcS',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'base_cotizacion_riesgos',
    clave: 'bcR',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'base_cotizacion_caja',
    clave: 'bcC',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },

  // ── Tarifas ───────────────────────────────────────────────────────────────
  {
    field: 'tarifa_pension',
    clave: 'tP',
    type: 'number',
    width: '90px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'tarifa_salud',
    clave: 'tS',
    type: 'number',
    width: '90px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'tarifa_riesgos',
    clave: 'tR',
    type: 'number',
    width: '90px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'tarifa_caja',
    clave: 'tC',
    type: 'number',
    width: '90px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'tarifa_sena',
    clave: 'tSena',
    type: 'number',
    width: '100px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'tarifa_icbf',
    clave: 'tIcbf',
    type: 'number',
    width: '100px',
    align: 'right',
    abrevia: true,
  },

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  {
    field: 'cotizacion_pension',
    clave: 'cP',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_solidaridad_solidaridad',
    clave: 'fSol',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_solidaridad_subsistencia',
    clave: 'fSub',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_voluntario_pension_afiliado',
    clave: 'volAfi',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_voluntario_pension_aportante',
    clave: 'volApo',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_salud',
    clave: 'cS',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_riesgos',
    clave: 'cR',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_caja',
    clave: 'cC',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_sena',
    clave: 'cSena',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_icbf',
    clave: 'cIcbf',
    type: 'currency',
    width: '140px',
    align: 'right',
    abrevia: true,
  },
  {
    field: 'cotizacion_total',
    clave: 'total',
    type: 'currency',
    width: '150px',
    align: 'right',
  },
];

/** Las 42 columnas de la tabla, en el orden del ERP anterior. */
export const APORTE_DETALLE_COLUMNS: readonly ColumnDef[] = META.map((meta) => ({
  field: meta.field,
  headerKey: `${SIGLA}.${meta.clave}`,
  type: meta.type,
  width: meta.width,
  align: meta.align,
  // Las novedades son banderas: se muestran como `Sí` / `—` en vez del
  // `Sí` / `No` por defecto, que con nueve columnas satura la fila de negativos.
  booleanKeyPrefix: meta.type === 'boolean' ? NOVEDAD : undefined,
}));

/** Una abreviatura y su significado, para la leyenda. */
export interface AbreviaturaDetalle {
  readonly siglaKey: string;
  readonly nombreKey: string;
}

/**
 * Las abreviaturas que hay que explicar. Salen de la misma metadata que las
 * columnas: agregar una columna abreviada la suma a la leyenda sola.
 */
export const APORTE_DETALLE_ABREVIATURAS: readonly AbreviaturaDetalle[] = META.filter(
  (meta) => meta.abrevia,
).map((meta) => ({
  siglaKey: `${SIGLA}.${meta.clave}`,
  nombreKey: `${NOMBRE}.${meta.clave}`,
}));
