import type { DocumentEntityConfig } from './entity-config.types';

/**
 * Configuración de un módulo de negocio con **documentos transaccionales**
 * del framework configuracional (camino A — ver docs/architecture).
 *
 * Los masters administrativos no entran aquí: son features directos que cada
 * app registra en el descriptor de módulo / menú de su sidebar.
 */
export interface ModuleConfig {
  /** Identificador estable del módulo. Aparece en URLs y como key del registry. */
  readonly id: string;
  /** Clave i18n del nombre visible. Ej: `'modules.compra.name'`. */
  readonly displayNameKey: string;
  /** Clase PrimeIcon usada en el menú. Ej: `'pi pi-shopping-cart'`. */
  readonly iconClass: string;
  /** Documentos transaccionales del módulo. */
  readonly documents: readonly DocumentEntityConfig[];
}
