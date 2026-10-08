// Import profundo y `type`-only a propósito: el barrel de permisos importa de
// vuelta estos tipos para filtrar el menú, y pasar por él acá cerraría el ciclo.
import type { ModeloId } from '../permissions/modelo.catalog';

/**
 * Tipos del menú del sidebar declarativo.
 *
 * Viven en `core/erp-modules` y no en `layouts/` porque el menú es parte del
 * contrato del `ErpModuleDescriptor`: lo declaran los módulos y lo consumen el
 * layout (para pintarlo) y `core/permissions` (para podarlo). Tenerlos en
 * `layouts/` obligaba a que core importara de layouts — la dependencia al revés.
 *
 * Dos clases de entradas de primer nivel:
 *   1. `SidebarSimpleItem` — un enlace directo (Dashboard, Reportes, etc.).
 *   2. `SidebarAccordion` — acordeón que agrupa varios items (Administrador,
 *      Compra, Venta, etc.).
 *
 * El acordeón puede contener uno o varios **grupos**. Cada grupo opcionalmente
 * declara un `labelKey` para mostrar un sub-header. Si no se declara, los
 * items del grupo aparecen directamente bajo el acordeón sin sub-header.
 *
 * Cuando llegue un módulo del `MODULE_REGISTRY` con documentos, su acordeón
 * derivado se traducirá a esta misma estructura — el template solo conoce
 * `SidebarSection`.
 */

/** Item simple del sidebar (Dashboard, Reportes, etc.). */
export interface SidebarSimpleItem {
  readonly kind: 'item';
  /** Clave i18n del label visible. */
  readonly labelKey: string;
  /** Clase PrimeIcon, p. ej. `'pi pi-th-large'`. */
  readonly iconClass: string;
  /**
   * Path absoluto al que apunta el item, sin el prefijo `/t/<slug>/`.
   * Ej: `'dashboard'` resuelve a `'/t/acme/dashboard'`.
   */
  readonly path: string;
  /**
   * Modelo del backend que hace visible el item. Sin declarar, siempre visible.
   * Debe ser **el mismo** que protege su ruta vía `withPermission`.
   */
  readonly modelo?: ModeloId;
}

/** Item navegable dentro de un grupo (Contactos, Ítems, etc.). */
export interface SidebarLeafItem {
  readonly labelKey: string;
  /**
   * Path absoluto al item, sin el prefijo `/t/<slug>/`.
   * Ej: `'contactos'` resuelve a `'/t/acme/contactos'`.
   */
  readonly path: string;
  /**
   * Prefijo de URL que marca este item como activo. Default: `path`.
   *
   * Solo lo declaran los documentos: su link apunta a `<doc>/list`, pero las
   * páginas hermanas (`new`, `edit`, detalle) cuelgan de `<doc>/`, así que aquí
   * se declara la raíz (`<doc>`) para que todas resalten el mismo item. El resto
   * de items (masters, informes, procesos) ya es raíz de su contexto y lo omite.
   */
  readonly activeMatch?: string;
  /**
   * Modelo del backend que hace visible el item. Sin declarar, siempre visible.
   * Debe ser **el mismo** que protege su ruta vía `withPermission`: si el menú
   * y la ruta divergen, el sidebar ofrece un link que rebota al acceso denegado.
   */
  readonly modelo?: ModeloId;
}

/** Sub-grupo opcional dentro de un acordeón (p. ej. "Documentos" o "Utilidades"). */
export interface SidebarGroup {
  /** Si se declara, se renderiza como sub-header del grupo. Si no, los items van directos. */
  readonly labelKey?: string;
  readonly items: readonly SidebarLeafItem[];
}

/**
 * Acordeón de primer nivel en el sidebar.
 *
 * Aloja todos los items relacionados de una sección (Administrador con sus
 * masters, Compra con sus documentos, etc.). El `id` se usa solo para
 * preservar el estado expand/collapse en memoria; no afecta a las URLs.
 */
export interface SidebarAccordion {
  readonly kind: 'accordion';
  readonly id: string;
  readonly labelKey: string;
  readonly iconClass: string;
  /**
   * Si el acordeón arranca expandido al entrar/cambiar de módulo.
   * Default `false` (cerrado) — declarar `true` en los que deban abrir.
   * Solo afecta el estado inicial; el usuario puede abrir/cerrar luego a mano.
   */
  readonly defaultExpanded?: boolean;
  readonly groups: readonly SidebarGroup[];
}

/** Cualquier entrada de primer nivel del sidebar. */
export type SidebarSection = SidebarSimpleItem | SidebarAccordion;
