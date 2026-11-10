import { type FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import type { ErpSelectOption, ImpuestoLinea, TasaImpuesto } from '@reddoc/core';
import {
  type ItemOption,
  type ComercialDetalleFormRawValue,
  recomputeImpuestosLinea,
} from '@reddoc/core';

/** `FormGroup` tipado de una línea de detalle comercial. */
export type ComercialDetalleGroup = FormGroup<{
  id: FormControl<number | null>;
  item: FormControl<ItemOption | null>;
  cantidad: FormControl<number | null>;
  precio: FormControl<number | null>;
  descuento: FormControl<number | null>;
  impuestos_ids: FormControl<number[]>;
  impuestos_totales: FormControl<readonly ImpuestoLinea[]>;
  impuestos_disponibles: FormControl<readonly TasaImpuesto[]>;
  detalle: FormControl<string | null>;
  /** Almacén de la línea; solo se renderiza donde la tabla declara la columna. */
  almacen: FormControl<ErpSelectOption | null>;
  /** Centro de costo de la línea; solo se renderiza donde la tabla declara la columna. */
  centro_costo: FormControl<ErpSelectOption | null>;
  /** Línea origen afectada (importar desde documento); `null` en líneas normales. */
  documento_detalle_afectado: FormControl<number | null>;
}>;

/**
 * Crea un `FormGroup` de línea comercial (vacío o precargado en edición).
 *
 * `almacenPorDefecto` precarga en la línea nueva el almacén de la cabecera, como
 * hacía el legacy: lo normal es que todas las líneas salgan del mismo almacén y
 * la persona corrija solo las excepciones. Solo lo pasa el documento que muestra
 * la columna; el resto crea la línea sin almacén.
 *
 * `centroCostoPorDefecto` hace lo mismo con el centro de costo (el «grupo» del
 * legacy, que en compra precargaba cada línea con el de la cabecera).
 *
 * Suscripciones auto-contenidas (solo referencian controles del propio grupo,
 * así viven/mueren con él):
 *  - al elegir ítem → autollena el precio (editable).
 *  - al cambiar cantidad/precio/descuento/impuestos → recalcula los montos de
 *    impuesto. Con `impuestos_disponibles` vacío (línea cargada sin re-seleccionar
 *    el ítem) se preservan los montos que vinieron del backend.
 */
export function createComercialDetalleGroup(
  value?: Partial<ComercialDetalleFormRawValue>,
  almacenPorDefecto?: ErpSelectOption | null,
  centroCostoPorDefecto?: ErpSelectOption | null,
): ComercialDetalleGroup {
  const group: ComercialDetalleGroup = new FormGroup({
    id: new FormControl<number | null>(value?.id ?? null),
    item: new FormControl<ItemOption | null>(value?.item ?? null, {
      validators: Validators.required,
    }),
    cantidad: new FormControl<number | null>(value?.cantidad ?? 1, {
      validators: [Validators.required, Validators.min(1)],
    }),
    precio: new FormControl<number | null>(value?.precio ?? null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    descuento: new FormControl<number | null>(value?.descuento ?? 0, {
      validators: [Validators.min(0), Validators.max(100)],
    }),
    impuestos_ids: new FormControl<number[]>([...(value?.impuestos_ids ?? [])], {
      nonNullable: true,
    }),
    impuestos_totales: new FormControl<readonly ImpuestoLinea[]>(value?.impuestos_totales ?? [], {
      nonNullable: true,
    }),
    impuestos_disponibles: new FormControl<readonly TasaImpuesto[]>(
      value?.impuestos_disponibles ?? [],
      { nonNullable: true },
    ),
    detalle: new FormControl<string | null>(value?.detalle ?? null),
    almacen: new FormControl<ErpSelectOption | null>(value?.almacen ?? almacenPorDefecto ?? null),
    centro_costo: new FormControl<ErpSelectOption | null>(
      value?.centro_costo ?? centroCostoPorDefecto ?? null,
    ),
    documento_detalle_afectado: new FormControl<number | null>(
      value?.documento_detalle_afectado ?? null,
    ),
  });

  group.controls.item.valueChanges.subscribe((opt) => {
    if (opt) group.controls.precio.setValue(opt.precio);
  });

  const recompute = (): void => {
    if (group.controls.impuestos_disponibles.value.length === 0) return;
    group.controls.impuestos_totales.setValue(recomputeImpuestosLinea(group.getRawValue()), {
      emitEvent: false,
    });
  };
  group.controls.cantidad.valueChanges.subscribe(recompute);
  group.controls.precio.valueChanges.subscribe(recompute);
  group.controls.descuento.valueChanges.subscribe(recompute);
  group.controls.impuestos_ids.valueChanges.subscribe(recompute);
  group.controls.impuestos_disponibles.valueChanges.subscribe(recompute);

  return group;
}

/**
 * Replica el centro de costo de la cabecera en las líneas que aún no se
 * guardaron. Las persistidas conservan el suyo: cambiarlo es decisión explícita,
 * fila por fila. A diferencia de las líneas de cuenta, las importadas de otro
 * documento sí lo reciben: el ítem no trae centro de costo propio de su origen.
 */
export function propagarCentroCostoALineasComerciales(
  detalles: FormArray<ComercialDetalleGroup>,
  centroCosto: ErpSelectOption | null,
): void {
  for (const group of detalles.controls) {
    if (group.controls.id.value !== null) continue;
    group.controls.centro_costo.setValue(centroCosto);
  }
}
