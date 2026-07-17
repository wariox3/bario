import type { ModuleConfig } from '@erp/core/module-config';
import { FACTURA_VENTA_CONFIG } from '../venta/documentos/factura-venta/factura-venta.config';
import { FACTURA_COMPRA_CONFIG } from '../compra/documentos/factura-compra/factura-compra.config';
import { PAGO_CONFIG } from '../cartera/documentos/pago/pago.config';
import { EGRESO_CONFIG } from '../tesoreria/documentos/egreso/egreso.config';

/**
 * Configuración del módulo General para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * General no tiene documentos propios: reusa los de Venta, Compra, Cartera y
 * Tesorería para que la facturación, el recaudo y el desembolso estén a mano
 * sin salir del módulo. Es el mismo
 * patrón con el que Venta y Compra reusan los masters de General — las páginas
 * del documento son agnósticas de módulo y derivan el suyo del `ActiveModuleStore`,
 * así que la navegación se queda dentro de General cuando se entra desde acá.
 */
export const GENERAL_CONFIG: ModuleConfig = {
  id: 'general',
  displayNameKey: 'modules.general.name',
  iconClass: 'pi pi-cog',
  documents: [FACTURA_VENTA_CONFIG, FACTURA_COMPRA_CONFIG, PAGO_CONFIG, EGRESO_CONFIG],
};
