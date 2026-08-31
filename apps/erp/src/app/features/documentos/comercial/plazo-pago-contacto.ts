import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Rol con el que el documento mira a su contacto, y por tanto qué plazo de los
 * dos que el contacto tiene pactados es el que manda.
 *
 * Un mismo contacto puede ser cliente y proveedor a la vez con condiciones
 * distintas en cada sentido: a nosotros nos paga a 8 días pero le compramos a
 * 30. Un documento de compra mira el plazo de **proveedor**; uno de venta, el de
 * **cliente**.
 */
export type PlazoPagoOrigen = 'proveedor' | 'cliente';

/** Campo de `general/contacto/seleccionar/` que trae el plazo pactado en cada sentido. */
const CAMPO_PLAZO: Readonly<Record<PlazoPagoOrigen, string>> = {
  proveedor: 'plazo_pago_proveedor_id',
  cliente: 'plazo_pago_id',
};

/** Controles que participan del autocompletado del plazo. */
export interface PlazoPagoDesdeContactoConfig {
  readonly contacto: FormControl<ErpSelectOption | null>;
  readonly plazoPago: FormControl<ErpSelectOption | null>;
  /** Qué plazo del contacto manda: `'proveedor'` en compra, `'cliente'` en venta. */
  readonly origen: PlazoPagoOrigen;
  readonly destroyRef: DestroyRef;
}

/**
 * Autocompleta el plazo de pago del documento con el que el contacto tiene
 * pactado, cada vez que se elige un contacto.
 *
 * El plazo es una condición del contacto, no del documento: quien lo trae es el
 * proveedor (o el cliente) que se acaba de seleccionar, y el usuario solo lo
 * sobrescribe por excepción. Por eso una selección de contacto **pisa** el plazo
 * que hubiera —incluido el sugerido por `suggestedIndex`—, y un contacto sin
 * plazo pactado lo **vacía**: dejar el del contacto anterior mostraría una
 * condición que ya no rige (el campo es requerido, así que el formulario lo
 * marca y la persona elige a mano).
 *
 * El valor se asigna como `{ id, nombre: '' }`, la convención del repo para una
 * FK que llega sin etiqueta (así cargan también los formularios en edición): el
 * `lib-api-select` del campo resuelve el nombre contra su propio catálogo por
 * `dataKey`, de modo que aquí **no hace falta ninguna petición** — el
 * `plazo_pago_proveedor_dias`/`plazo_pago_dias` que acompaña al id tampoco se
 * usa, porque donde el documento tiene vencimiento los días los aporta
 * `setupVencimientoAutocompute` desde el catálogo de plazos. Ambas reglas se
 * componen sin conocerse: este `setValue` dispara el `valueChanges` del plazo y
 * el vencimiento se recalcula solo.
 *
 * Solo reacciona a cambios **emitidos**: la carga en edición aplica la cabecera
 * con `emitEvent: false`, así que el plazo guardado en el documento se respeta y
 * no lo pisa el del contacto.
 *
 * Debe llamarse desde el constructor del componente (contexto de inyección). El
 * `DestroyRef` explícito cierra la suscripción al destruir el componente.
 */
export function setupPlazoPagoDesdeContacto(cfg: PlazoPagoDesdeContactoConfig): void {
  cfg.contacto.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe((contacto) => {
    const plazoId = leerPlazoId(contacto, cfg.origen);
    // Mismo plazo que ya está elegido: nada que hacer (evita recomputar el
    // vencimiento en vano y no pisa la opción con etiqueta por una sin ella).
    if (plazoId === (cfg.plazoPago.value?.id ?? null)) return;
    cfg.plazoPago.setValue(plazoId === null ? null : { id: plazoId, nombre: '' });
  });
}

/**
 * Lee del contacto seleccionado el id del plazo que corresponde al `origen`.
 *
 * `ErpSelectOption` conserva los campos extra del endpoint bajo un índice
 * `unknown` (`lib-contacto-select` vuelca la fila cruda en la opción), así que el
 * valor se estrecha antes de usarlo: un contacto sin plazo pactado manda `null`.
 */
function leerPlazoId(contacto: ErpSelectOption | null, origen: PlazoPagoOrigen): number | null {
  const valor = contacto?.[CAMPO_PLAZO[origen]];
  return typeof valor === 'number' ? valor : null;
}
