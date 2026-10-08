import type { ModuleConfig } from '@erp/core/module-config';
import { PAGO_CONFIG } from './documentos/pago/pago.config';

/**
 * Configuración del módulo Cartera para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un documento
 * nuevo (p. ej. saldo inicial de CxC): crear su carpeta bajo `documentos/<id>/`
 * con su config + rutas y agregarlo aquí.
 */
export const CARTERA_CONFIG: ModuleConfig = {
  id: 'cartera',
  displayNameKey: 'modules.cartera.name',
  iconClass: 'pi pi-credit-card',
  documents: [PAGO_CONFIG],
};
