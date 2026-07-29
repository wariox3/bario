import type { ModuleConfig } from '@erp/core/module-config';
import { ASIENTO_CONFIG } from './documentos/asiento/asiento.config';
import { DEPRECIACION_CONFIG } from './documentos/depreciacion/depreciacion.config';

/**
 * Configuración del módulo Contabilidad para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Hasta el asiento, contabilidad era un módulo sin documentos transaccionales
 * (solo masters, informes y utilidades).
 *
 * Cada entrada en `documents` representa un tipo de documento sobre el endpoint
 * genérico `/api/general/documento`. Para sumar uno nuevo: crear su carpeta bajo
 * `documentos/<id>/` con su config, constantes, páginas y rutas, y agregarlo aquí.
 */
export const CONTABILIDAD_CONFIG: ModuleConfig = {
  id: 'contabilidad',
  displayNameKey: 'modules.contabilidad.name',
  iconClass: 'pi pi-calculator',
  documents: [ASIENTO_CONFIG, DEPRECIACION_CONFIG],
};
