import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import {
  DocumentNotFoundError,
  MissingDocumentKeyError,
  MissingModuleContextError,
} from '../errors/config.errors';
import { ModuleNavigationStore } from '../module-navigation.store';
import type { DocumentEntityConfig } from '@reddoc/core';

/**
 * Nombre del parámetro de ruta que identifica el documento activo.
 * Centralizado en una constante para evitar typos en `route.paramMap.get(...)`.
 */
export const DOCUMENT_KEY_ROUTE_PARAM = 'documentKey';

/**
 * Resuelve el documento activo dentro del módulo activo. Dos modos:
 *
 *  - **Con id literal** (`activeDocumentResolver('factura-venta')`): identifica
 *    el documento por nombre fijo. Preferido cuando cada documento es un
 *    `loadChildren` con sus propias rutas (`list/nuevo/editar/detalle`) y su
 *    form/detalle viven junto a su config.
 *  - **Sin argumento** (`activeDocumentResolver()`): lee el id del parámetro
 *    de ruta `:documentKey`. Útil cuando un padre genérico maneja varios
 *    documentos con la misma forma de URL.
 *
 * Garantías:
 *  - El módulo padre ya está cargado en `ModuleNavigationStore`
 *    (su `activeModuleResolver` debió correr antes).
 *  - El documento existe en `module.documents`.
 *
 * Lanza errores tipados que el `ErrorHandler` global captura.
 */
export function activeDocumentResolver(documentId?: string): ResolveFn<DocumentEntityConfig> {
  return (route: ActivatedRouteSnapshot): DocumentEntityConfig => {
    const navigationStore = inject(ModuleNavigationStore);
    const activeModule = navigationStore.activeModule();
    if (!activeModule) throw new MissingModuleContextError();

    const resolvedId = documentId ?? route.paramMap.get(DOCUMENT_KEY_ROUTE_PARAM);
    if (!resolvedId) throw new MissingDocumentKeyError();

    const document = activeModule.documents.find((candidate) => candidate.id === resolvedId);
    if (!document) throw new DocumentNotFoundError(activeModule.id, resolvedId);

    navigationStore.setActiveDocument(document);
    return document;
  };
}
