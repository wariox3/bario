import type { ModuleConfig } from '@erp/core/module-config';
import { CONTRATO_SERVICIO_CONFIG } from './documentos/contrato-servicio/contrato-servicio.config';
import { PEDIDO_SERVICIO_CONFIG } from './documentos/pedido-servicio/pedido-servicio.config';
import { FACTURA_VENTA_CONFIG } from './documentos/factura-venta/factura-venta.config';
import { FACTURA_VENTA_RECURRENTE_CONFIG } from './documentos/factura-venta-recurrente/factura-venta-recurrente.config';
import { PEDIDO_CLIENTE_CONFIG } from './documentos/pedido-cliente/pedido-cliente.config';

/**
 * Configuración del módulo Venta para el framework configuracional
 * de documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un
 * documento nuevo: crear su carpeta bajo `documentos/<id>/` con su config
 * + rutas y agregarlo aquí.
 */
export const VENTA_CONFIG: ModuleConfig = {
  id: 'venta',
  displayNameKey: 'modules.venta.name',
  iconClass: 'pi pi-tag',
  documents: [
    PEDIDO_CLIENTE_CONFIG,
    FACTURA_VENTA_CONFIG,
    FACTURA_VENTA_RECURRENTE_CONFIG,
    CONTRATO_SERVICIO_CONFIG,
    PEDIDO_SERVICIO_CONFIG,
  ],
};
