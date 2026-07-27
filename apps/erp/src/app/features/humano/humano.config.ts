import type { ModuleConfig } from '@erp/core/module-config';
import { NOMINA_CONFIG } from './documentos/nomina/nomina.config';

/**
 * Configuración del módulo Humano para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Los masters del módulo (empleado, contrato, cargo…) NO entran acá: son
 * features directos con su propio endpoint (camino B).
 *
 * Los documentos de humano son de **solo lectura**: los emite el proceso de
 * liquidación, no se capturan a mano.
 */
export const HUMANO_CONFIG: ModuleConfig = {
  id: 'humano',
  displayNameKey: 'modules.humano.name',
  iconClass: 'pi pi-users',
  documents: [NOMINA_CONFIG],
};
