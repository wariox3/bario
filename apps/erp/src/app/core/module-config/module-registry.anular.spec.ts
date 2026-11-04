import { ERP_MODULE_REGISTRY } from './module-registry.constant';

/**
 * Qué documentos ofrecen "Anular" en su ficha (`capabilities.canAnular`).
 *
 * Es la lista del ERP anterior, ficha por ficha: los 19 documentos que tenían el
 * botón. Notas de venta, pedidos, plantillas recurrentes, contratos y procesos
 * de humano no lo tenían y no lo tienen. Prender o apagar uno es una decisión
 * de negocio —anular es irreversible—, así que cambiar esta lista tiene que
 * pasar por acá a propósito.
 */
const CON_ANULAR = [
  // Venta
  'cuenta-cobro',
  'factura-pos',
  'factura-pos-electronica',
  'factura-venta',
  'remision',
  // Compra
  'documento-soporte',
  'factura-compra',
  'nota-ajuste',
  'nota-credito-compra',
  'nota-debito-compra',
  // Cartera / Tesorería
  'egreso',
  'pago',
  // Inventario
  'entrada',
  'salida',
  'traslado',
  // Humano
  'nomina-electronica',
  // Contabilidad
  'asiento',
  'cierre',
  'depreciacion',
].sort();

describe('ERP_MODULE_REGISTRY — capabilities.canAnular', () => {
  it('lo ofrecen exactamente los documentos que lo tenían en el ERP anterior', async () => {
    const modulos = await Promise.all(Object.values(ERP_MODULE_REGISTRY).map((load) => load()));
    // Un documento puede registrarse en más de un módulo: se cuenta una vez.
    const conAnular = [
      ...new Set(
        modulos
          .flatMap((m) => m.documents)
          .filter((d) => d.capabilities.canAnular)
          .map((d) => d.id),
      ),
    ].sort();

    expect(conAnular).toEqual(CON_ANULAR);
  });
});
