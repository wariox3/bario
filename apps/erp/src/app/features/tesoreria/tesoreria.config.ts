import type { ModuleConfig } from '@erp/core/module-config';
import { SALDO_INICIAL_CXP_CONFIG } from '@erp/features/documentos/saldo-inicial/saldo-inicial.config';
import { EGRESO_CONFIG } from './documentos/egreso/egreso.config';

/**
 * Configuración del módulo Tesorería para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un documento
 * nuevo: crear su carpeta bajo `documentos/<id>/` con su config + rutas y
 * agregarlo aquí.
 */
export const TESORERIA_CONFIG: ModuleConfig = {
  id: 'tesoreria',
  displayNameKey: 'modules.tesoreria.name',
  iconClass: 'pi pi-wallet',
  documents: [EGRESO_CONFIG, SALDO_INICIAL_CXP_CONFIG],
};
