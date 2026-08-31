/**
 * Saca el id del documento de la respuesta de guardado.
 *
 * El gateway devuelve el body crudo del `POST`. El schema del backend
 * (`GenDocumentoCrear`) declara el documento plano con su `id`, pero el ERP
 * anterior lo envolvía en `{ documento: … }`: se contemplan las dos formas y,
 * si no aparece por ninguna, el llamador cae a la lista en vez de navegar a una
 * URL inválida.
 */
export function extractDocumentoId(saved: unknown): number | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const plano = (saved as { id?: unknown }).id;
  if (typeof plano === 'number') return plano;
  const envuelto = (saved as { documento?: { id?: unknown } }).documento?.id;
  return typeof envuelto === 'number' ? envuelto : null;
}
