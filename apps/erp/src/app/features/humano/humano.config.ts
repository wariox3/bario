import type { ModuleConfig } from '@erp/core/module-config';
import { NOMINA_CONFIG } from './documentos/nomina/nomina.config';
import { NOMINA_ELECTRONICA_CONFIG } from './documentos/nomina-electronica/nomina-electronica.config';

/**
 * Configuración del módulo Humano para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Los masters del módulo (empleado, contrato, cargo…) NO entran acá: son
 * features directos con su propio endpoint (camino B).
 *
 * Los documentos de humano son de **solo lectura**: no se capturan a mano. La
 * nómina la emite el proceso de liquidación; la nómina electrónica la fabrica
 * la acción "Generar" de su propio listado, consolidando las nóminas del
 * periodo.
 */
export const HUMANO_CONFIG: ModuleConfig = {
  id: 'humano',
  displayNameKey: 'modules.humano.name',
  iconClass: 'pi pi-users',
  documents: [NOMINA_CONFIG, NOMINA_ELECTRONICA_CONFIG],
};
