/** Endpoint del libro de movimientos contables. */
export const MOVIMIENTO_ENDPOINT = '/contabilidad/movimiento/';

/**
 * Serializador de la exportación a Excel del libro. Lo declaraba igual el ERP
 * legacy (`serializador: 'informe_movimiento'` + `excel_informe: 'True'`).
 *
 * TODO(backend): confirmar que `/contabilidad/movimiento/excel/` lo acepte en el
 * body del POST (el legacy lo mandaba como query param de un GET).
 */
export const MOVIMIENTO_SERIALIZADOR = 'informe_movimiento';

/**
 * Contrato de lectura del **movimiento contable**: la línea ya contabilizada del
 * libro, tal como la sirve el serializador `lista` de `contabilidad/movimiento/`.
 *
 * Vive en `core/` y no en el feature de movimientos porque lo leen dos pantallas
 * que no se conocen: la consulta del libro (`features/contabilidad/informes/movimiento`) y
 * el diálogo "Contabilidad" de las fichas de detalle (`core/components/
 * contabilidad-dialog`), que muestra las líneas de un solo documento.
 *
 * Los nombres de las relaciones llegan con **un solo** guion bajo
 * (`contacto_nombre_corto`, `cuenta_codigo`…): son los alias del serializer
 * `ConMovimiento`, verificados contra el schema del backend (2026-09-08). Se
 * conservan tal cual: es una consulta de solo lectura, no hay formulario que
 * mapear, y renombrarlos obligaría a un mapper que solo existiría para maquillar.
 *
 * Antes estaban tipados con **doble** guion bajo, portados del listado del ERP
 * nuevo en vez de la respuesta real, y las cuatro columnas de relación salían
 * vacías. Ojo con la asimetría: los **filtros** de este mismo recurso sí viajan
 * como rutas ORM con doble guion bajo (ver `MOVIMIENTO_FILTER_FIELDS`).
 */
export interface Movimiento {
  readonly id: number;
  /** Consecutivo del documento que originó el movimiento. */
  readonly numero: number | null;
  readonly fecha: string | null;
  readonly comprobante_nombre: string | null;
  readonly contacto_nombre_corto: string | null;
  /** Código de la cuenta imputada (no su id). */
  readonly cuenta_codigo: string | null;
  /**
   * Centro de costo. El ERP anterior lo llamaba `grupo`; el backend de hoy lo
   * serializa como `centro_costo_nombre`.
   */
  readonly centro_costo_nombre: string | null;
  readonly debito: string | number | null;
  readonly credito: string | number | null;
  readonly base: string | number | null;
  readonly detalle: string | null;
}
