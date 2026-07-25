import type { ModuleConfig } from '@erp/core/module-config';
import { ENTRADA_CONFIG } from './documentos/entrada/entrada.config';
import { SALIDA_CONFIG } from './documentos/salida/salida.config';

/**
 * Configuración del módulo Inventario para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un documento
 * nuevo (traslado): crear su carpeta bajo `documentos/<id>/` con su config,
 * constantes y rutas, y agregarlo aquí — el form y la ficha ya los aporta
 * `documentos/_shared/movimiento/`, y las líneas
 * `features/documentos/inventario/`.
 */
export const INVENTARIO_CONFIG: ModuleConfig = {
  id: 'inventario',
  displayNameKey: 'modules.inventario.name',
  iconClass: 'pi pi-box',
  documents: [ENTRADA_CONFIG, SALIDA_CONFIG],
};
