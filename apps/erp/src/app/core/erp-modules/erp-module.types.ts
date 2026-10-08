import type { SidebarSection } from './sidebar-menu.types';

/**
 * Descriptor de un módulo del ERP como **contexto de navegación**.
 *
 * No confundir con `ModuleConfig` del framework configuracional
 * (`core/module-config/`): aquel describe documentos transaccionales sobre
 * `/api/documento`. Este describe el módulo a nivel de UX — qué muestra el
 * topbar, hacia dónde redirige `/t/:slug/<id>`, y qué entradas aparecen en
 * el sidebar cuando el módulo está activo.
 *
 * Un módulo "puro masters" (General) solo tiene este descriptor.
 * Un módulo "puro documentos" (Compra futura) tendrá tanto su `ModuleConfig`
 * como su `ErpModuleDescriptor`.
 */
export interface ErpModuleDescriptor {
  /** Identificador del módulo, también el primer segmento de la URL post-tenant. */
  readonly id: string;
  /** Clave i18n del nombre visible en topbar/sidebar. */
  readonly displayNameKey: string;
  /** Clase PrimeIcon mostrada junto al label en el topbar. */
  readonly iconClass: string;
  /**
   * Ruta hija a la que redirige `/t/:slug/<id>` cuando no se especifica un master/documento.
   * Si es `null`, el módulo redirige a su placeholder (sin contenido todavía).
   */
  readonly defaultChildPath: string | null;
  /**
   * Flag del contenedor que habilita este módulo, p. ej. `'acceso_venta'`.
   *
   * Es el eje **plan del tenant**: qué contrató la empresa, no qué puede hacer
   * el usuario (eso son los `PermissionCode` del menú). Sin declarar, el módulo
   * está siempre disponible — es el caso de General, que es la base, y de las
   * áreas ocultas como Seguridad.
   */
  readonly accessFlag?: string;
  /** Entradas del sidebar mostradas cuando este módulo está activo. */
  readonly menu: readonly SidebarSection[];
}
