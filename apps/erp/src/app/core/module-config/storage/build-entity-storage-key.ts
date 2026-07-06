import type { EntityConfig } from '@reddoc/core';

/** Prefijo común de todas las claves de localStorage para filtros de entidades del framework. */
const STORAGE_KEY_PREFIX = 'entity-filters';

/**
 * Construye la clave canónica de `localStorage` para una entidad documental
 * del framework configuracional del ERP.
 *
 * Formato: `entity-filters:<moduleId>:<entityId>:v<schemaVersion>`.
 *
 * Cada master directo (camino B) define su propia clave literal y no usa
 * este helper — éste solo aplica al camino A (documentos transaccionales).
 */
export function buildEntityStorageKey(moduleId: string, entity: EntityConfig): string {
  return `${STORAGE_KEY_PREFIX}:${moduleId}:${entity.id}:v${entity.schemaVersion}`;
}
