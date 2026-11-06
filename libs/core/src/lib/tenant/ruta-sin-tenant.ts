/** Prefijo `/t/<slug>` con que arrancan las rutas de negocio de cada tenant. */
const PREFIJO_TENANT = /^\/t\/[^/]+/;

/**
 * Quita el prefijo `/t/<slug>` de una ruta: `/t/lumber/venta/factura-venta/list`
 * queda en `/venta/factura-venta/list`. Una ruta sin tenant se devuelve igual, y
 * la raíz del tenant (`/t/lumber`) queda en `/`.
 */
export function rutaSinTenant(path: string): string {
  return path.replace(PREFIJO_TENANT, '') || '/';
}
