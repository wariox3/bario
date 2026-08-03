import type { ColumnDef, FilterCondition, FilterField, SortSpec } from '../data-list';
import type { DocumentoListRowBase } from './documento.types';

/**
 * Tipo discriminador de entidades del framework.
 *
 * En v2.0 el framework configuracional aplica únicamente a **documentos
 * transaccionales** sobre el endpoint genérico. Los masters administrativos
 * viven como features directos fuera de este tipo (ver docs/architecture).
 *
 * El campo se mantiene como discriminador (con una sola variante hoy) para
 * dejar abierta la extensión futura sin breaking changes.
 */
export type EntityKind = 'document';

/**
 * Efecto del documento sobre el inventario.
 * - `inflow`:  aumenta stock (compra, devolución de venta).
 * - `outflow`: disminuye stock (venta, devolución de compra).
 *
 * Los documentos que no mueven inventario (recaudos y demás movimientos
 * puramente contables) omiten el campo — ver `DocumentEntityConfig`.
 */
export type InventoryEffect = 'inflow' | 'outflow';

/**
 * Capacidades visibles en la UI del documento.
 * Cada flag declara lo que la entidad SOPORTA técnicamente; la visibilidad
 * final también depende de los permisos del usuario.
 */
export interface DocumentCapabilities {
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canView: boolean;
  readonly canDelete: boolean;
  readonly canSelectRows: boolean;
  readonly canImport: boolean;
  readonly canExportExcel: boolean;
  readonly canExportZip: boolean;
  readonly canGenerate: boolean;
}

/**
 * Datos mínimos que recibe `canEditRow`: el id y las banderas de estado base,
 * presentes tanto en la fila de lista (`DocumentoListRowBase`) como en la
 * lectura de detalle (`DocumentoReadBase`). Una regla que necesite más campos
 * debe exponerlos antes en el read-model del backend, para que las 3 capas
 * (lista, detalle, ruta de edición) puedan evaluar la misma política por igual.
 */
export type EditableRowContext = Pick<DocumentoListRowBase, 'id' | 'estado_aprobado'>;

/**
 * Rutas relativas al módulo.
 * El framework las prefija con el path del módulo en runtime.
 *
 * Ej: `list: 'documento/factura-compra/list'` en módulo `compra` resuelve
 * a `/t/<slug>/compra/documento/factura-compra/list`.
 */
export interface EntityRoutes {
  readonly list: string;
  readonly new: string;
  readonly edit: string;
  readonly detail: string;
}

/**
 * Descriptor de importación masiva opcional para un documento.
 * Se declara cuando `capabilities.canImport` es true.
 */
export interface ImportDescriptor {
  /** Clave i18n del nombre del archivo de ejemplo. */
  readonly templateNameKey: string;
  /** Ruta absoluta al archivo de ejemplo descargable. */
  readonly templateUrl: string;
  /** Parámetros adicionales que se envían junto al archivo importado. */
  readonly extraPayload?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Configuración de un documento transaccional.
 *
 * Vive sobre el endpoint genérico del backend y se discrimina por
 * `documentTypeId`. Toda la información que el `BaseDocumentListComponent`,
 * el form y el detalle necesitan vive aquí.
 */
export interface DocumentEntityConfig {
  readonly kind: 'document';
  /** Identificador estable en URLs (kebab-case). Ej: `'factura-compra'`. */
  readonly id: string;
  /** Clave i18n del nombre visible. */
  readonly displayNameKey: string;
  /** Endpoint REST. Para documentos típicamente `'/api/documento'`. */
  readonly endpoint: string;
  /** Discriminador para el backend genérico. Único across todo el ERP. */
  readonly documentTypeId: number;
  /**
   * Efecto sobre el inventario. Metadata para forms/inventario — la lista no la
   * usa. Se omite en los documentos que no mueven stock (p. ej. el pago, que es
   * un recaudo: sus líneas son movimientos contables, no ítems).
   */
  readonly inventoryEffect?: InventoryEffect;
  /**
   * Versión del schema. Se usa como sufijo en la clave de localStorage
   * para invalidar filtros guardados cuando el shape cambia.
   */
  readonly schemaVersion: number;
  readonly columns: readonly ColumnDef[];
  readonly filters: readonly FilterField[];
  /**
   * Orden por defecto que el gateway aplica cuando el usuario no ha ordenado.
   * Invisible en la UI (no marca columna); el orden del usuario lo reemplaza.
   * Ej: `[{ field: 'id', direction: 'desc' }]`.
   */
  readonly defaultSort?: readonly SortSpec[];
  /**
   * Filtros implícitos que el gateway inyecta siempre, invisibles al usuario y
   * no editables desde la UI (se combinan con AND junto a los del usuario).
   * Mismo rol que `documento_tipo_id`, pero declarado por el documento.
   * Ej: `[{ field: 'venta', operator: 'eq', value: true }]`.
   */
  readonly defaultFilters?: readonly FilterCondition[];
  readonly routes: EntityRoutes;
  readonly capabilities: DocumentCapabilities;
  /**
   * Política de editabilidad por documento: decide si una fila/cabecera concreta
   * puede editarse AHORA según su estado de negocio. Es ortogonal a
   * `capabilities.canEdit`, que declara si el documento soporta edición en
   * absoluto. Es la fuente ÚNICA consumida por las 3 capas: la acción "editar"
   * de la lista (`visibleFor`), el botón "editar" del detalle (`[disabled]`) y
   * el resolver de la ruta `editar/:id` (bloqueo por URL directa).
   *
   * Si se omite → siempre editable (cuando `capabilities.canEdit` es true).
   * Aislar la regla aquí permite que evolucione (de un estado a varios) tocando
   * solo este archivo, sin alterar el mecanismo genérico de cada capa.
   *
   * Ej: `canEditRow: (row) => !row.estado_aprobado`.
   */
  readonly canEditRow?: (row: EditableRowContext) => boolean;
  /**
   * Ids de strategies que el documento expone como acciones extras.
   * Cada id debe corresponder a un `EntityActionStrategy` registrado.
   */
  readonly extraActionIds?: readonly string[];
  readonly importDescriptor?: ImportDescriptor;
}

/**
 * Alias del único tipo de entidad del framework en v2.0.
 * Se conserva el nombre `EntityConfig` para no romper imports existentes;
 * el discriminador `kind` queda como hook de extensión futura.
 */
export type EntityConfig = DocumentEntityConfig;
