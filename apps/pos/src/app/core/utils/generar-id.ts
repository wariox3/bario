/**
 * Identificador único local (para las pestañas de venta, que nunca viajan al
 * backend).
 *
 * `crypto.randomUUID` solo existe en contextos seguros: una caja abierta por
 * HTTP en la red local (una tablet apuntando a la IP del equipo) no lo tiene.
 * `getRandomValues` sí está en cualquier contexto, así que es el respaldo.
 */
export function generarId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
