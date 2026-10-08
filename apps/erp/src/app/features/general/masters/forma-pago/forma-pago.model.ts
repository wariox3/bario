/**
 * Forma de pago. Master administrativo del módulo General (camino B), cableado
 * en el módulo Compra. Nombre obligatorio y una cuenta contable asociada.
 *
 * Shape de lectura: el FK viaja con el id pelado (`cuenta`) acompañado de su
 * `cuenta_codigo`/`cuenta_nombre` para pintar la etiqueta del selector, igual que
 * `cuenta-banco`. Si el endpoint devolviera el FK con otro nombre, ajustar este
 * modelo y el mapper.
 */
export interface FormaPago {
  readonly id: number;
  readonly nombre: string;
  readonly cuenta: number | null;
  readonly cuenta_codigo?: string | null;
  readonly cuenta_nombre?: string | null;
}

/** Write-model para crear/editar una forma de pago. */
export interface FormaPagoPayload {
  readonly nombre: string;
  readonly cuenta: number | null;
}
