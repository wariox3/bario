import type { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl } from '@angular/forms';
import {
  addDays,
  SELECT_ENDPOINTS,
  type ErpSelectDataService,
  type ErpSelectOption,
} from '@reddoc/core';

/** Fila de `plazo-pago/seleccionar/` con los días que aporta el plazo (contado = 0). */
export interface PlazoPagoOption extends ErpSelectOption {
  readonly dias?: number | null;
}

/** Controles y dependencias que necesita el autocálculo del vencimiento. */
export interface VencimientoAutocomputeConfig {
  readonly fecha: FormControl<Date | null>;
  readonly plazoPago: FormControl<ErpSelectOption | null>;
  readonly fechaVence: FormControl<Date | null>;
  readonly selectData: ErpSelectDataService;
  readonly destroyRef: DestroyRef;
  /** Endpoint del plazo de pago; por default `SELECT_ENDPOINTS.plazoPago`. */
  readonly endpoint?: string;
}

/**
 * Autocalcula `fechaVence = fecha + días del plazo` al cambiar la fecha o el plazo.
 *
 * Los días salen del campo `dias` del endpoint `plazo-pago/seleccionar/`; "contado"
 * (dias 0) deja el vencimiento en la misma fecha (hoy cuando la fecha es hoy). El
 * campo sigue editable: las ediciones manuales se conservan hasta el próximo cambio
 * de fecha/plazo. Si el plazo no trae `dias` (backend aún sin el campo), no toca el
 * vencimiento (queda manual).
 *
 * Debe llamarse desde el constructor del componente (contexto de inyección). El
 * `DestroyRef` explícito cierra las suscripciones al destruir el componente.
 */
export function setupVencimientoAutocompute(cfg: VencimientoAutocomputeConfig): void {
  const endpoint = cfg.endpoint ?? SELECT_ENDPOINTS.plazoPago;
  const plazoDias = new Map<number, number>();

  const recompute = (): void => {
    const fecha = cfg.fecha.value;
    const plazoId = cfg.plazoPago.value?.id;
    if (!fecha || plazoId == null) return;
    const dias = plazoDias.get(plazoId);
    if (dias == null) return;
    cfg.fechaVence.setValue(addDays(fecha, dias), { emitEvent: false });
  };

  cfg.fecha.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe(recompute);
  cfg.plazoPago.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe(recompute);

  cfg.selectData
    .fetchOptions<PlazoPagoOption>(endpoint)
    .pipe(takeUntilDestroyed(cfg.destroyRef))
    .subscribe({
      next: (plazos) => {
        for (const plazo of plazos) {
          if (plazo.dias != null) plazoDias.set(plazo.id, plazo.dias);
        }
        // Si ya hay fecha + plazo elegidos, refrescar el vencimiento.
        recompute();
      },
      error: () => {
        // Sin días disponibles el vencimiento queda manual (sigue editable).
      },
    });
}
