/**
 * Se pidió guardar pagos mientras la misma tabla ya guarda otros. Un segundo lote
 * reenviaría filas que siguen sin `id` y el backend registraría el cobro dos veces.
 */
export class PagosEnCursoError extends Error {
  constructor() {
    super('Ya hay un guardado de pagos en curso');
    this.name = 'PagosEnCursoError';
  }
}

/** Se intentó persistir un pago sin cuenta de banco (la fila debía llegar filtrada por inválida). */
export class PagoSinCuentaBancoError extends Error {
  constructor() {
    super('El pago no tiene cuenta de banco');
    this.name = 'PagoSinCuentaBancoError';
  }
}
