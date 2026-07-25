import type { ModuleConfig } from '@erp/core/module-config';
import { ENTRADA_CONFIG } from './documentos/entrada/entrada.config';

/**
 * Configuración del módulo Inventario para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un documento
 * nuevo (salida, traslado): crear su carpeta bajo `documentos/<id>/` con su
 * config + rutas y agregarlo aquí — la familia de líneas ya está compartida en
 * `features/documentos/inventario/`.
 */
export const INVENTARIO_CONFIG: ModuleConfig = {
  id: 'inventario',
  displayNameKey: 'modules.inventario.name',
  iconClass: 'pi pi-box',
  documents: [ENTRADA_CONFIG],
};
