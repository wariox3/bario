/** Endpoint `seleccionar` de cuentas de banco (destino de los pagos). */
export const CUENTA_BANCO_ENDPOINT = '/general/cuenta-banco/seleccionar/';

/**
 * Id del tipo de cuenta bancaria "caja" (efectivo), del catálogo global
 * `cuenta-banco-tipo`. Valor heredado del legacy; el resto de los tipos (1 es
 * "Banco nacional") son cuentas de banco.
 */
export const CUENTA_BANCO_TIPO_CAJA = 3;

/** Recurso de pagos de documento (CRUD). */
export const DOCUMENTO_PAGO_ENDPOINT = '/general/documento-pago/';
