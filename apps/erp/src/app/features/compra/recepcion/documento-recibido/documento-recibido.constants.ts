import type { ColumnDef } from '@reddoc/core';
import type { RowAction } from '@reddoc/feature-base';
import type { DocumentoRecibidoTipo, EstadoRecepcionFiltro } from './documento-recibido.model';
import type { EventoRadian } from './evento-radian.model';

const I18N = 'entities.documentoRecibido';

/** Tipos del filtro, en el orden en que se ofrecen. */
export const TIPOS: readonly DocumentoRecibidoTipo[] = [
  'factura_venta',
  'nota_credito',
  'nota_debito',
];

/** Opciones del filtro de recepción, en el orden en que se ofrecen. */
export const ESTADOS_RECEPCION: readonly EstadoRecepcionFiltro[] = ['todos', 'si', 'no'];

/** Abre la ficha del documento. */
export const ROW_ACTION_DETALLE = 'ver-detalle';

export const ROW_ACTIONS: readonly RowAction[] = [
  { id: ROW_ACTION_DETALLE, labelKey: `${I18N}.verDetalle`, iconClass: 'pi pi-eye', inline: true },
];

// ── Adjuntos (tab de la ficha) ──────────────────────────────────────────────

const I18N_ADJUNTO = `${I18N}.adjuntos`;

export const ADJUNTO_ACTION_DESCARGAR = 'descargar';

export const ADJUNTO_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: ADJUNTO_ACTION_DESCARGAR,
    labelKey: `${I18N_ADJUNTO}.descargar`,
    iconClass: 'pi pi-download',
    inline: true,
  },
];

export const ADJUNTO_COLUMNS: readonly ColumnDef[] = [
  { field: 'nombre', headerKey: `${I18N_ADJUNTO}.columns.nombre`, type: 'text' },
  {
    field: 'tamano_texto',
    headerKey: `${I18N_ADJUNTO}.columns.tamano`,
    type: 'text',
    width: '100px',
    align: 'right',
  },
  {
    field: 'creado_texto',
    headerKey: `${I18N_ADJUNTO}.columns.creado`,
    type: 'text',
    width: '150px',
  },
];

// ── Eventos RADIAN (tab de la ficha) ────────────────────────────────────────

const I18N_EVENTO = `${I18N}.eventos`;

export const EVENTO_ACTION_XML = 'xml';
export const EVENTO_ACTION_RESPUESTA = 'respuesta';

/** XML y respuesta, solo en los eventos que los tienen. */
export const EVENTO_ROW_ACTIONS: readonly RowAction[] = [
  {
    id: EVENTO_ACTION_XML,
    labelKey: `${I18N_EVENTO}.acciones.xml`,
    iconClass: 'pi pi-code',
    visibleFor: (row) => (row as EventoRadian).tiene_xml,
  },
  {
    id: EVENTO_ACTION_RESPUESTA,
    labelKey: `${I18N_EVENTO}.acciones.respuesta`,
    iconClass: 'pi pi-file',
    visibleFor: (row) => (row as EventoRadian).tiene_respuesta,
  },
];

export const EVENTO_COLUMNS: readonly ColumnDef[] = [
  { field: 'numero', headerKey: `${I18N_EVENTO}.columns.numero`, type: 'text', width: '100px' },
  {
    field: 'codigo',
    headerKey: `${I18N_EVENTO}.columns.evento`,
    type: 'enum',
    enumKeyPrefix: `${I18N_EVENTO}.codigos`,
    width: '190px',
  },
  {
    field: 'estado',
    headerKey: `${I18N_EVENTO}.columns.estado`,
    type: 'enum',
    enumKeyPrefix: `${I18N_EVENTO}.estados`,
    width: '120px',
  },
  { field: 'persona_nombre', headerKey: `${I18N_EVENTO}.columns.personaRecibe`, type: 'text' },
  {
    field: 'concepto_reclamo',
    headerKey: `${I18N_EVENTO}.columns.conceptoReclamo`,
    type: 'enum',
    enumKeyPrefix: `${I18N_EVENTO}.conceptos`,
  },
  {
    field: 'respuesta_descripcion',
    headerKey: `${I18N_EVENTO}.columns.respuestaDian`,
    type: 'text',
  },
  {
    field: 'intentos',
    headerKey: `${I18N_EVENTO}.columns.intentos`,
    type: 'number',
    width: '90px',
    align: 'right',
  },
  {
    field: 'enviado_texto',
    headerKey: `${I18N_EVENTO}.columns.enviado`,
    type: 'text',
    width: '150px',
  },
  { field: 'cude', headerKey: `${I18N_EVENTO}.columns.cude`, type: 'text' },
];

/** Lo que acepta la carga a mano: el ZIP que manda el proveedor o su XML. */
export const CARGA_ACCEPT = '.zip,.xml';

/**
 * Columnas de la bandeja. Ordenables solo las que el backend sabe ordenar
 * (`fecha_emision`, `numero`, `total_a_pagar`): el `field` viaja tal cual como
 * `ordering`.
 */
export const COLUMNS: readonly ColumnDef[] = [
  {
    field: 'fecha_emision',
    headerKey: `${I18N}.columns.fecha`,
    type: 'date',
    width: '110px',
  },
  {
    field: 'documento_tipo',
    headerKey: `${I18N}.columns.tipo`,
    type: 'enum',
    enumKeyPrefix: `${I18N}.tipos`,
    width: '130px',
  },
  {
    field: 'numero',
    headerKey: `${I18N}.columns.numero`,
    type: 'text',
    width: '130px',
  },
  {
    field: 'forma_pago_nombre',
    headerKey: `${I18N}.columns.formaPago`,
    type: 'text',
    width: '140px',
  },
  { field: 'proveedor_razon_social', headerKey: `${I18N}.columns.proveedor`, type: 'text' },
  { field: 'proveedor_nit', headerKey: `${I18N}.columns.nit`, type: 'text', width: '140px' },
  {
    field: 'total_a_pagar',
    headerKey: `${I18N}.columns.total`,
    type: 'currency',
    width: '140px',
    align: 'right',
  },
  {
    field: 'radian_estado',
    headerKey: `${I18N}.columns.radian`,
    type: 'enum',
    enumKeyPrefix: `${I18N}.radianEstados`,
    width: '190px',
  },
];
