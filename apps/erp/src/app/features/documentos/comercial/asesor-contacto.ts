import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl } from '@angular/forms';
import type { ErpSelectOption } from '@reddoc/core';

/** Controles que participan del autocompletado del asesor. */
export interface AsesorDesdeContactoConfig {
  readonly contacto: FormControl<ErpSelectOption | null>;
  readonly asesor: FormControl<ErpSelectOption | null>;
  readonly destroyRef: DestroyRef;
}

/**
 * Sugiere el asesor del documento con el que el cliente tiene asignado, cada vez
 * que se elige un cliente (`asesor_id` / `asesor_nombre_corto` de
 * `general/contacto/seleccionar/`).
 *
 * - **Cliente con asesor:** lo pone, aunque hubiera otro. El asesor es del
 *   cliente, y quien lo cambia lo hace por excepción.
 * - **Cliente sin asesor:** vacía el campo solo si lo había puesto el cliente
 *   anterior: ese asesor ya no corresponde. Un asesor que la persona eligió a
 *   mano se respeta.
 *
 * El valor lleva la etiqueta en `nombre` y en `nombre_corto` (la que pinta
 * `lib-asesor-select`), así que no hace falta ninguna petición.
 *
 * Solo reacciona a cambios **emitidos**: la carga en edición aplica la cabecera
 * con `emitEvent: false`, así que el asesor guardado en el documento se respeta.
 *
 * Debe llamarse desde el constructor del componente.
 */
export function setupAsesorDesdeContacto(cfg: AsesorDesdeContactoConfig): void {
  /** Id del asesor que puso el último cliente; `null` si el actual no vino de ahí. */
  let aplicado: number | null = null;

  cfg.contacto.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe((contacto) => {
    const asesor = leerAsesor(contacto);
    const actual = cfg.asesor.value?.id ?? null;

    if (asesor) {
      aplicado = asesor.id;
      if (asesor.id !== actual) cfg.asesor.setValue(asesor);
      return;
    }

    if (aplicado !== null && aplicado === actual) cfg.asesor.setValue(null);
    aplicado = null;
  });
}

/**
 * Lee el asesor del contacto seleccionado. `lib-contacto-select` vuelca la fila
 * cruda en la opción bajo un índice `unknown`, así que se estrecha antes de usarlo.
 */
function leerAsesor(contacto: ErpSelectOption | null): ErpSelectOption | null {
  const id = contacto?.['asesor_id'];
  if (typeof id !== 'number') return null;
  const valor = contacto?.['asesor_nombre_corto'];
  const nombre = typeof valor === 'string' ? valor : '';
  return { id, nombre, nombre_corto: nombre };
}
