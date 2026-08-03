import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { I18nService, calcularImpuestosLinea, toHora, type TasaImpuesto } from '@reddoc/core';
import { FieldErrorComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpImpuestoSelectComponent } from '@erp/core/components/impuesto-select/erp-impuesto-select.component';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '@erp/features/general/masters/item/item.service';
import type { Item } from '@erp/features/general/masters/item/item.model';
import { ErpItemAutocompleteComponent } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { MODALIDAD_ENDPOINT, PUESTO_ENDPOINT } from '../../servicio-documento.constants';
import { createDetalleGroup, type DetalleGroup } from '../../servicio-documento-detalle.form';
import { tieneHorasProgramadas } from '../../servicio-documento-detalle.utils';
import type { DetalleFormRawValue } from '../../servicio-documento-detalle.types';
import { ServicioDocumentoService } from '../../servicio-documento.service';
import type {
  CalcularPrecioSupervigilanciaPayload,
  CalcularPrecioSupervigilanciaResult,
} from '../../servicio-documento.model';

/**
 * Modal de alta/edición de una **línea de detalle** de un documento de servicio.
 *
 * Trabaja sobre una **copia** (`DetalleGroup` propio) que se reinicializa cada
 * vez que el modal se abre: así "Cancelar" descarta los cambios sin tocar el
 * `FormArray` del padre. Al confirmar emite el valor crudo validado por `save`;
 * el padre decide si lo agrega o lo reemplaza. El layout es espacioso (agrupado
 * en comercial / cobertura / impuestos) porque el modal sí tiene espacio.
 */
@Component({
  selector: 'app-servicio-documento-detalle-modal',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    DatePickerModule,
    InputNumberModule,
    ToggleSwitchModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    ErpImpuestoSelectComponent,
    ErpItemAutocompleteComponent,
  ],
  templateUrl: './servicio-documento-detalle-modal.component.html',
  styleUrl: './servicio-documento-detalle-modal.component.scss',
})
export class ServicioDocumentoDetalleModalComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly service = inject(ServicioDocumentoService);
  private readonly itemService = inject(ItemService);

  protected readonly t = this.i18n.t;
  protected readonly modalidadEndpoint = MODALIDAD_ENDPOINT;
  protected readonly puestoEndpoint = PUESTO_ENDPOINT;

  /** Visibilidad (two-way con el padre). */
  readonly visible = model<boolean>(false);
  /** Línea a editar; `null` ⇒ modo alta. */
  readonly value = input<DetalleFormRawValue | null>(null);
  /** Sector del documento (vive en el form padre); alimenta el tarifador. */
  readonly sectorId = input<number | null>(null);
  /** Id del contacto del documento; filtra las opciones de puesto. */
  readonly contactoId = input<number | null>(null);
  /** Puesto ya elegido en las líneas existentes; cuando está presente se pre-llena y bloquea. */
  readonly lockedPuesto = input<ErpSelectOption | null>(null);
  /** Salario del documento (del form padre); se pre-llena en modo alta. */
  readonly salario = input<number | null>(null);
  /**
   * `true` mientras el padre persiste la línea en vivo (edición). Bloquea los
   * botones y el descarte del diálogo; el padre cierra el modal solo al éxito.
   */
  readonly saving = input<boolean>(false);
  /**
   * Habilita el bloqueo de la cobertura en las líneas que ya tienen horas
   * programadas. Solo lo activa pedido servicio; apagado por defecto para no
   * cambiar el comportamiento de los demás documentos de la familia.
   */
  readonly lockCoberturaOnProgramadas = input<boolean>(false);
  /** Emite el valor crudo validado al confirmar. */
  readonly save = output<DetalleFormRawValue>();

  protected readonly isEditMode = computed(() => this.value() !== null);
  protected readonly group = signal<DetalleGroup>(createDetalleGroup());

  /**
   * Cobertura bloqueada: la línea ya tiene turnos programados, así que fechas,
   * horario, modalidad, salario y días no pueden moverse (dejaría la programación
   * existente inconsistente). Lo comercial de la línea sigue editable.
   */
  protected readonly coberturaBloqueada = computed(() => {
    const value = this.value();
    return this.lockCoberturaOnProgramadas() && value !== null && tieneHorasProgramadas(value);
  });

  protected readonly puestoParams = computed(() => {
    const params: Record<string, string> = {};
    const id = this.contactoId();
    if (id != null) params['contacto_id'] = String(id);
    return params;
  });

  protected readonly formValues = toSignal(
    toObservable(this.group).pipe(
      switchMap((g) => g.valueChanges.pipe(startWith(g.getRawValue()))),
      map((v) => ({
        cantidad: v.cantidad ?? 0,
        precio: v.precio ?? 0,
        dias_semana: v.dias_semana ?? [],
        festivo: v.festivo ?? false,
        hora_desde: v.hora_desde ?? null,
        hora_hasta: v.hora_hasta ?? null,
        modalidad_id: v.modalidad?.id ?? null,
        salario: v.salario ?? null,
      })),
    ),
    {
      initialValue: {
        cantidad: 0,
        precio: 0,
        dias_semana: [] as number[],
        festivo: false,
        hora_desde: null as Date | null,
        hora_hasta: null as Date | null,
        modalidad_id: null as number | null,
        salario: null as number | null,
      },
    },
  );

  protected readonly subtotal = computed(() => {
    const { cantidad, precio } = this.formValues();
    return cantidad * precio;
  });

  /** `true` mientras se trae el detalle del ítem seleccionado. */
  protected readonly itemDetailLoading = signal(false);

  /**
   * Detalle completo del ítem seleccionado en la línea (`null` si no hay ítem o
   * la petición falla). Reacciona solo a **selecciones reales** del control
   * `item` (sin `startWith`): al elegir uno dispara `ItemService.getById(id)`
   * para traer el shape completo (impuestos, cuentas, etc.) que el autocomplete
   * no incluye. El `distinctUntilChanged` vive dentro del `switchMap` para
   * reiniciarse en cada apertura del modal (grupo nuevo). En modo edición no
   * dispara al abrir, así no pisa los impuestos ya guardados de la línea.
   */
  protected readonly itemDetail = toSignal(
    toObservable(this.group).pipe(
      switchMap((g) =>
        g.controls.item.valueChanges.pipe(
          map((opt) => opt?.id ?? null),
          distinctUntilChanged(),
        ),
      ),
      tap((id) => this.itemDetailLoading.set(id != null)),
      switchMap((id) => {
        if (id == null) return of<Item | null>(null);
        return this.itemService.getById(id).pipe(catchError(() => of<Item | null>(null)));
      }),
      tap(() => this.itemDetailLoading.set(false)),
    ),
    { initialValue: null as Item | null },
  );

  /**
   * Payload del tarifador, o `null` mientras la cobertura esté incompleta
   * (faltan horario, modalidad, sector o no hay días activos). Reacciona tanto
   * al form (`formValues`) como al `sectorId` del padre.
   */
  private readonly calcPayload = computed<CalcularPrecioSupervigilanciaPayload | null>(() => {
    const { hora_desde, hora_hasta, modalidad_id, dias_semana, festivo, salario } =
      this.formValues();
    const sector_id = this.sectorId();
    if (
      !hora_desde ||
      !hora_hasta ||
      modalidad_id == null ||
      sector_id == null ||
      salario == null ||
      (dias_semana.length === 0 && !festivo)
    ) {
      return null;
    }
    return {
      hora_desde: toHora(hora_desde),
      hora_hasta: toHora(hora_hasta),
      modalidad_id,
      sector_id,
      lunes: dias_semana.includes(0),
      martes: dias_semana.includes(1),
      miercoles: dias_semana.includes(2),
      jueves: dias_semana.includes(3),
      viernes: dias_semana.includes(4),
      sabado: dias_semana.includes(5),
      domingo: dias_semana.includes(6),
      festivo,
      salario,
    };
  });

  /** `true` mientras hay un cálculo en vuelo (debounce + request). */
  protected readonly calcLoading = signal(false);

  /** Resultado del tarifador para la cobertura actual (`null` si incompleta). */
  protected readonly calcResult = toSignal(
    toObservable(this.calcPayload).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      tap((payload) => this.calcLoading.set(payload !== null)),
      debounceTime(800),
      switchMap((payload) => {
        if (!payload) return of<CalcularPrecioSupervigilanciaResult | null>(null);
        return this.service
          .calcularPrecioSupervigilancia(payload)
          .pipe(catchError(() => of<CalcularPrecioSupervigilanciaResult | null>(null)));
      }),
      tap(() => this.calcLoading.set(false)),
    ),
    { initialValue: null as CalcularPrecioSupervigilanciaResult | null },
  );

  /**
   * Copia el `precio_minimo` de la tarifa supervigilancia al control `precio`.
   * No hace nada si no hay cálculo o si el precio está bloqueado por cortesía.
   */
  protected definirPrecio(): void {
    const result = this.calcResult();
    const precio = this.group().controls.precio;
    if (!result || precio.disabled) return;
    precio.setValue(result.precio_minimo);
  }

  protected toggleDia(dia: number): void {
    if (this.coberturaBloqueada()) return;
    const ctrl = this.group().controls.dias_semana;
    const current = [...ctrl.value];
    const idx = current.indexOf(dia);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(dia);
      current.sort((a, b) => a - b);
    }
    ctrl.setValue(current);
  }

  protected toggleFestivo(): void {
    if (this.coberturaBloqueada()) return;
    const ctrl = this.group().controls.festivo;
    ctrl.setValue(!ctrl.value);
  }

  constructor() {
    // Al abrir, (re)inicializa la copia desde el valor actual. `untracked` evita
    // re-inicializar si `value` cambia mientras el modal sigue abierto.
    // El puesto bloqueado solo aplica en ALTA: las líneas nuevas heredan el
    // puesto de la primera (consistencia). Al EDITAR queda editable.
    effect(() => {
      if (!this.visible()) return;
      const isEditMode = untracked(this.isEditMode);
      const locked = untracked(this.lockedPuesto);
      const group = createDetalleGroup(untracked(this.value) ?? undefined);
      if (locked && !isEditMode) {
        group.controls.puesto.setValue(locked);
        group.controls.puesto.disable();
      }
      if (!isEditMode) {
        group.controls.salario.setValue(untracked(this.salario));
      }
      // Línea con turnos ya programados: la cobertura se congela. Los controles
      // deshabilitados igual viajan en `getRawValue()`, así que el PATCH conserva
      // sus valores originales.
      if (untracked(this.coberturaBloqueada)) {
        group.controls.fecha_desde.disable();
        group.controls.fecha_hasta.disable();
        group.controls.hora_desde.disable();
        group.controls.hora_hasta.disable();
        group.controls.modalidad.disable();
        group.controls.salario.disable();
      }
      this.group.set(group);
    });

    // Al traer el detalle del ítem (selección real), sincroniza los impuestos de
    // venta del ítem en el multiselector de la línea. Solo corre cuando
    // `itemDetail` emite, así no pisa la selección guardada al abrir en edición.
    effect(() => {
      const detail = this.itemDetail();
      if (!detail) return;
      const ventaIds = (detail.impuestos ?? [])
        .filter((imp) => imp.impuesto_venta)
        .map((imp) => imp.impuesto);
      untracked(this.group).controls.impuestos_ids.setValue(ventaIds);
    });
  }

  protected onSave(): void {
    const group = this.group();
    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }
    const raw = group.getRawValue();
    const detail = this.itemDetail();
    // Solo recalcular los montos de impuesto cuando tenemos las tasas del ítem
    // (selección real). Al editar sin re-seleccionar el ítem, `itemDetail()` es null:
    // se conservan los montos cargados en vez de vaciarlos (en la ruta persistida el
    // padre igual los sobreescribe con la respuesta autoritativa del backend).
    if (detail) {
      const subtotal = (raw.cantidad ?? 0) * (raw.precio ?? 0);
      // Borde de adaptación: parsea las tasas del ítem (strings del backend) a
      // números y delega la fórmula fiscal al kernel compartido.
      const tasas: TasaImpuesto[] = (detail.impuestos ?? [])
        .filter((imp) => imp.impuesto_venta && raw.impuestos_ids.includes(imp.impuesto))
        .map((imp) => ({
          id: imp.impuesto,
          nombre: imp.impuesto_nombre ?? '',
          porcentaje: parseFloat(imp.impuesto_porcentaje ?? '0'),
          porcentajeBase: parseFloat(imp.impuesto_porcentaje_base ?? '100'),
        }));
      group.controls.impuestos_totales.setValue(calcularImpuestosLinea(subtotal, tasas));
    }
    // Horas y precio mínimo del tarifador. Solo si hay cálculo vigente; si no, se
    // conservan los que traía la línea (autoritativos del backend en edición).
    const calc = this.calcResult();
    if (calc) {
      group.controls.horas_diurnas.setValue(calc.horas_diurnas);
      group.controls.horas_nocturnas.setValue(calc.horas_nocturnas);
      group.controls.horas.setValue(calc.horas_diurnas + calc.horas_nocturnas);
      group.controls.precio_minimo.setValue(calc.precio_minimo);
    }
    // El padre cierra el modal al confirmarse el guardado: en edición espera el
    // HTTP (cierra solo al éxito, queda abierto en error); en alta cierra al instante.
    this.save.emit(group.getRawValue());
  }

  protected onCancel(): void {
    this.visible.set(false);
  }
}
