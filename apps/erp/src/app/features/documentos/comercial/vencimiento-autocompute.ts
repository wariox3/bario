import { computed, signal, type DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { AbstractControl, FormControl, ValidationErrors } from '@angular/forms';
import {
  addDays,
  daysBetween,
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
  /**
   * Con plazo de contado (dias 0) el vencimiento **es** la fecha de emisión y el
   * campo se deshabilita. Lo activan los documentos de venta: la factura la
   * emitimos nosotros, no hay un papel ajeno con otra fecha que respetar. En
   * compra queda apagado (ver `VencimientoAutocompute`).
   */
  readonly bloquearEnContado?: boolean;
}

/**
 * Estado del vencimiento, para que el formulario pueda **explicar** de dónde
 * salió la fecha y señalar cuándo se apartó del plazo pactado.
 *
 * En compra el campo nunca se bloquea: la factura del proveedor manda sobre la
 * condición pactada (llega con su propio vencimiento impreso y puede no
 * coincidir). Lo que el form hace con esto es contarlo —ver
 * `<app-vencimiento-hint>`—, no impedirlo. La excepción es `bloquearEnContado`.
 */
export interface VencimientoAutocompute {
  /** Días del plazo elegido (0 = contado); `null` mientras no se conozcan. */
  readonly diasPlazo: Signal<number | null>;
  /** Vencimiento que corresponde al plazo (`fecha + dias`); `null` si no se puede calcular. */
  readonly sugerido: Signal<Date | null>;
  /**
   * Días entre el vencimiento del plazo y el que hay en el campo: `0` coincide,
   * positivo = se venció más tarde de lo pactado, negativo = más temprano.
   * `null` cuando no hay con qué comparar (sin plazo, sin fecha o campo vacío).
   */
  readonly desvio: Signal<number | null>;
  /** Devuelve el campo al vencimiento que dicta el plazo. No hace nada sin sugerido. */
  readonly restablecer: () => void;
  /** `true` mientras el campo está deshabilitado por plazo de contado. */
  readonly bloqueado: Signal<boolean>;
  /**
   * Reevalúa el vencimiento tras poblar la cabecera con `emitEvent: false`. Sin
   * esto, si el catálogo de plazos llegó antes que la cabecera (carga sin
   * resolver), nada recalcularía el sugerido ni el bloqueo del contado.
   */
  readonly sincronizar: () => void;
}

/**
 * Un vencimiento anterior a la fecha de emisión no es una excepción comercial:
 * es un dato imposible. Esta es la única regla **dura** del campo —el resto de
 * las diferencias con el plazo se avisan, no se bloquean—.
 */
export function vencimientoAnteriorAFecha(
  fecha: FormControl<Date | null>,
): (control: AbstractControl) => ValidationErrors | null {
  return (control) => {
    const emision = fecha.value;
    const vence = control.value;
    if (!(emision instanceof Date) || !(vence instanceof Date)) return null;
    return daysBetween(emision, vence) < 0 ? { vencimientoAnterior: true } : null;
  };
}

/**
 * Autocalcula `fechaVence = fecha + días del plazo` al cambiar la fecha o el plazo,
 * y expone el estado resultante para que la UI lo explique.
 *
 * Los días salen del campo `dias` del endpoint `plazo-pago/seleccionar/`; "contado"
 * (dias 0) deja el vencimiento en la misma fecha. El campo sigue editable: las
 * ediciones manuales se conservan hasta el próximo cambio de fecha/plazo, y quedan
 * reflejadas en `desvio`. Si el plazo no trae `dias` (backend aún sin el campo), no
 * toca el vencimiento (queda manual y sin desvío que reportar).
 *
 * **La llegada del catálogo no pisa un vencimiento que ya tiene valor.** Los días
 * se piden por HTTP y aterrizan después de que el resolver pobló la cabecera en
 * edición; recalcular ahí borraría el vencimiento guardado en el documento y lo
 * reemplazaría por el que dicta el plazo de hoy. Al hidratar solo se rellena el
 * campo **vacío** (el caso del alta, donde el plazo se eligió antes de que
 * llegaran los días); con valor, el catálogo únicamente alimenta `sugerido`, que
 * es lo que permite señalar el desvío de un documento viejo.
 *
 * **Contado con `bloquearEnContado`:** el vencimiento se iguala a la fecha y el
 * control se deshabilita; vuelve a habilitarse al pasar a un plazo con días. Acá
 * la hidratación **sí** pisa el valor guardado: un documento viejo de contado con
 * otro vencimiento se corrige al abrirlo, en vez de mostrar bloqueado un dato que
 * la regla no admite. El guardado no se entera del bloqueo porque los forms arman
 * el payload con `getRawValue()`, que incluye los controles deshabilitados.
 *
 * Además instala la regla dura `vencimientoAnteriorAFecha` sobre el control, para
 * que ningún formulario tenga que acordarse de sumarla.
 *
 * Debe llamarse desde el constructor del componente (contexto de inyección). El
 * `DestroyRef` explícito cierra las suscripciones al destruir el componente.
 */
export function setupVencimientoAutocompute(
  cfg: VencimientoAutocomputeConfig,
): VencimientoAutocompute {
  const endpoint = cfg.endpoint ?? SELECT_ENDPOINTS.plazoPago;
  const plazoDias = new Map<number, number>();

  const diasPlazo = signal<number | null>(null);
  const sugerido = signal<Date | null>(null);
  const vence = signal<Date | null>(cfg.fechaVence.value);
  const bloqueado = signal(false);

  cfg.fechaVence.addValidators(vencimientoAnteriorAFecha(cfg.fecha));

  /**
   * Deshabilita o rehabilita el campo por contado. Solo rehabilita lo que este
   * helper deshabilitó: si el form entero se deshabilitó por otra razón, no se
   * lo abre por debajo.
   */
  const aplicarBloqueo = (contado: boolean): void => {
    if (contado === bloqueado()) return;
    bloqueado.set(contado);
    if (contado) cfg.fechaVence.disable({ emitEvent: false });
    else cfg.fechaVence.enable({ emitEvent: false });
  };

  const escribir = (valor: Date | null): void => {
    cfg.fechaVence.setValue(valor, { emitEvent: false });
    vence.set(valor);
  };

  /**
   * Recalcula el vencimiento del plazo. `hidratando` = el disparo vino del
   * catálogo recién llegado, no de una interacción: ahí el campo con valor se
   * respeta (ver el bloque de arriba), salvo en contado bloqueado.
   */
  const recompute = (hidratando = false): void => {
    const fecha = cfg.fecha.value;
    const plazoId = cfg.plazoPago.value?.id;
    const dias = plazoId == null ? undefined : plazoDias.get(plazoId);
    diasPlazo.set(dias ?? null);

    const calculado = fecha && dias != null ? addDays(fecha, dias) : null;
    sugerido.set(calculado);

    const contado = cfg.bloquearEnContado === true && dias === 0;
    aplicarBloqueo(contado);
    if (contado) {
      // El campo bloqueado sigue a la fecha, incluso vacía: no puede quedar
      // mostrando un vencimiento que nadie puede corregir.
      escribir(calculado);
      return;
    }
    if (!calculado) return;

    if (hidratando && cfg.fechaVence.value) {
      // Documento en edición: el valor guardado manda, pero hay que engancharlo
      // al desvío (llegó por `patchValue` silencioso y nadie lo notificó).
      vence.set(cfg.fechaVence.value);
      return;
    }
    escribir(calculado);
  };

  cfg.fecha.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe(() => {
    recompute();
    // La regla dura compara contra la fecha de emisión: al moverla hay que
    // revalidar el vencimiento (sin emitir, para no realimentar el ciclo).
    cfg.fechaVence.updateValueAndValidity({ emitEvent: false });
  });
  cfg.plazoPago.valueChanges.pipe(takeUntilDestroyed(cfg.destroyRef)).subscribe(() => recompute());
  // Ediciones manuales del campo: no tocan el sugerido, solo el desvío.
  cfg.fechaVence.valueChanges
    .pipe(takeUntilDestroyed(cfg.destroyRef))
    .subscribe((valor) => vence.set(valor));

  cfg.selectData
    .fetchOptions<PlazoPagoOption>(endpoint)
    .pipe(takeUntilDestroyed(cfg.destroyRef))
    .subscribe({
      next: (plazos) => {
        for (const plazo of plazos) {
          if (plazo.dias != null) plazoDias.set(plazo.id, plazo.dias);
        }
        recompute(true);
      },
      error: () => {
        // Sin días disponibles el vencimiento queda manual (sigue editable).
      },
    });

  return {
    diasPlazo,
    sugerido,
    desvio: computed(() => {
      // `vence` es el disparador (lo mueven las ediciones y la hidratación); el
      // valor se lee del control, que es la única fuente que nunca se desfasa —
      // un `patchValue` silencioso no emite y dejaría al espejo mintiendo.
      vence();
      const esperado = sugerido();
      const actual = cfg.fechaVence.value;
      return esperado && actual ? daysBetween(esperado, actual) : null;
    }),
    restablecer: () => {
      const esperado = sugerido();
      if (!esperado) return;
      cfg.fechaVence.setValue(esperado);
      cfg.fechaVence.markAsDirty();
    },
    bloqueado: bloqueado.asReadonly(),
    sincronizar: () => recompute(true),
  };
}
