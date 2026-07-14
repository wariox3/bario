import type { ModuleConfig } from '@erp/core/module-config';
import { FACTURA_COMPRA_CONFIG } from './documentos/factura-compra/factura-compra.config';
import { DOCUMENTO_SOPORTE_CONFIG } from './documentos/documento-soporte/documento-soporte.config';
import { NOTA_CREDITO_COMPRA_CONFIG } from './documentos/nota-credito-compra/nota-credito-compra.config';
import { NOTA_DEBITO_COMPRA_CONFIG } from './documentos/nota-debito-compra/nota-debito-compra.config';
import { FACTURA_COMPRA_RECURRENTE_CONFIG } from './documentos/factura-compra-recurrente/factura-compra-recurrente.config';
import { NOTA_AJUSTE_CONFIG } from './documentos/nota-ajuste/nota-ajuste.config';

/**
 * Configuración del módulo Compra para el framework configuracional de
 * documentos (camino A — ver docs/architecture/erp-module-architecture.md).
 *
 * Cada entrada en `documents` representa un tipo de documento transaccional
 * sobre el endpoint genérico `/api/general/documento`. Para sumar un documento
 * nuevo: crear su carpeta bajo `documentos/<id>/` con su config + rutas y
 * agregarlo aquí.
 */
export const COMPRA_CONFIG: ModuleConfig = {
  id: 'compra',
  displayNameKey: 'modules.compra.name',
  iconClass: 'pi pi-shopping-cart',
  documents: [
    FACTURA_COMPRA_CONFIG,
    DOCUMENTO_SOPORTE_CONFIG,
    NOTA_CREDITO_COMPRA_CONFIG,
    NOTA_DEBITO_COMPRA_CONFIG,
    FACTURA_COMPRA_RECURRENTE_CONFIG,
    NOTA_AJUSTE_CONFIG,
  ],
};
