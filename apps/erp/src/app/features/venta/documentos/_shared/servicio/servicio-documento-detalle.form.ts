import { FormControl, FormGroup, Validators } from '@angular/forms';
import { startOfToday, type ImpuestoLinea } from '@reddoc/core';
import type { ErpSelectOption } from '@reddoc/core';
import type { DetalleFormRawValue, ItemOption } from './servicio-documento-detalle.types';

function defaultFechaDesde(value?: Partial<DetalleFormRawValue>): Date | null {
  if (value !== undefined) return null;
  return new Date();
}

function defaultFechaHasta(value?: Partial<DetalleFormRawValue>): Date | null {
  if (value !== undefined) return null;
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
}

/** `FormGroup` tipado de una línea de detalle del documento de servicio. */
export type DetalleGroup = FormGroup<{
  id: FormControl<number | null>;
  item: FormControl<ItemOption | null>;
  puesto: FormControl<ErpSelectOption | null>;
  cantidad: FormControl<number | null>;
  precio: FormControl<number | null>;
  fecha_desde: FormControl<Date | null>;
  fecha_hasta: FormControl<Date | null>;
  hora_desde: FormControl<Date | null>;
  hora_hasta: FormControl<Date | null>;
  modalidad: FormControl<ErpSelectOption | null>;
  salario: FormControl<number | null>;
  programar: FormControl<boolean>;
  dias_semana: FormControl<number[]>;
  festivo: FormControl<boolean>;
  cortesia: FormControl<boolean>;
  compuesto: FormControl<boolean>;
  impuestos_ids: FormControl<number[]>;
  impuestos_totales: FormControl<readonly ImpuestoLinea[]>;
  horas: FormControl<number | null>;
  horas_diurnas: FormControl<number | null>;
  horas_nocturnas: FormControl<number | null>;
  precio_minimo: FormControl<number | null>;
  documento_detalle_afectado: FormControl<number | null>;
}>;

/**
 * Crea un `FormGroup` de línea de detalle (vacío o precargado en edición).
 *
 * Al seleccionar un ítem autollena el precio (editable) — suscripción
 * auto-contenida: solo referencia controles del propio grupo, así que no
 * retiene nada externo y vive/ muere con el form.
 */
export function createDetalleGroup(value?: Partial<DetalleFormRawValue>): DetalleGroup {
  const group: DetalleGroup = new FormGroup({
    // Id de la línea persistida; no editable, solo viaja para distinguir alta vs edición.
    id: new FormControl<number | null>(value?.id ?? null),
    item: new FormControl<ItemOption | null>(value?.item ?? null, {
      validators: Validators.required,
    }),
    puesto: new FormControl<ErpSelectOption | null>(value?.puesto ?? null, {
      validators: Validators.required,
    }),
    cantidad: new FormControl<number | null>(value?.cantidad ?? 1, {
      validators: [Validators.required, Validators.min(1)],
    }),
    precio: new FormControl<number | null>(value?.precio ?? null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    fecha_desde: new FormControl<Date | null>(value?.fecha_desde ?? defaultFechaDesde(value), {
      validators: Validators.required,
    }),
    fecha_hasta: new FormControl<Date | null>(value?.fecha_hasta ?? defaultFechaHasta(value), {
      validators: Validators.required,
    }),
    hora_desde: new FormControl<Date | null>(value?.hora_desde ?? startOfToday(), {
      validators: Validators.required,
    }),
    hora_hasta: new FormControl<Date | null>(value?.hora_hasta ?? startOfToday(), {
      validators: Validators.required,
    }),
    modalidad: new FormControl<ErpSelectOption | null>(value?.modalidad ?? null, {
      validators: Validators.required,
    }),
    salario: new FormControl<number | null>(value?.salario ?? null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    programar: new FormControl<boolean>(value?.programar ?? true, { nonNullable: true }),
    dias_semana: new FormControl<number[]>(
      value?.dias_semana != null ? [...value.dias_semana] : [0, 1, 2, 3, 4, 5, 6],
      { nonNullable: true },
    ),
    festivo: new FormControl<boolean>(value?.festivo ?? true, { nonNullable: true }),
    cortesia: new FormControl<boolean>(value?.cortesia ?? false, { nonNullable: true }),
    // Derivado del backend; no editable por UI, solo viaja para mostrarse y reenviarse.
    compuesto: new FormControl<boolean>(value?.compuesto ?? false, { nonNullable: true }),
    impuestos_ids: new FormControl<number[]>([...(value?.impuestos_ids ?? [])], {
      nonNullable: true,
    }),
    impuestos_totales: new FormControl<readonly ImpuestoLinea[]>(value?.impuestos_totales ?? [], {
      nonNullable: true,
    }),
    // Horas y precio mínimo derivados (backend o tarifador); no editables por UI,
    // solo viajan para mostrarse y persistirse.
    horas: new FormControl<number | null>(value?.horas ?? null),
    horas_diurnas: new FormControl<number | null>(value?.horas_diurnas ?? null),
    horas_nocturnas: new FormControl<number | null>(value?.horas_nocturnas ?? null),
    precio_minimo: new FormControl<number | null>(value?.precio_minimo ?? null),
    documento_detalle_afectado: new FormControl<number | null>(
      value?.documento_detalle_afectado ?? null,
    ),
  });

  // Recuerda el último precio antes de que cortesía lo ponga en 0, para restaurarlo
  // al desactivar (no volver al precio del ítem). Se inicializa con el precio cargado.
  let precioPreCortesia: number | null = group.controls.precio.value;

  // Al elegir ítem se autollena el precio, salvo que la cortesía lo tenga en 0.
  group.controls.item.valueChanges.subscribe((opt) => {
    if (opt && !group.controls.cortesia.value) group.controls.precio.setValue(opt.precio);
  });

  // Cortesía: guarda el precio actual, lo pone en 0 y lo bloquea; al desactivar
  // restaura ese último precio (definido por el usuario o por la tarifa).
  group.controls.cortesia.valueChanges.subscribe((on) => {
    const precio = group.controls.precio;
    if (on) {
      precioPreCortesia = precio.value;
      precio.setValue(0);
      precio.disable();
    } else {
      precio.enable();
      precio.setValue(precioPreCortesia ?? group.controls.item.value?.precio ?? null);
    }
  });

  // Estado inicial (edición con cortesía activa): precio en 0 y bloqueado.
  if (group.controls.cortesia.value) {
    group.controls.precio.setValue(0);
    group.controls.precio.disable();
  }

  return group;
}
