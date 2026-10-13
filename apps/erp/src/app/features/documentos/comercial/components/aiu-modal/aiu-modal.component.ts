import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { I18nService, formatCop, redondearMoneda } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import {
  ErpItemAutocompleteComponent,
  type ItemOption,
} from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import { VENTA_AIU_CAMPOS } from '@erp/features/configuracion/configuracion.constants';
import { configuracionToVentaAiuForm } from '@erp/features/configuracion/configuracion.mapper';
import {
  AIU_CONCEPTOS,
  AIU_PORCENTAJES_INICIALES,
  calcularAiu,
  type AiuConcepto,
  type AiuLinea,
} from '../../aiu';

/**
 * Modal **AIU** de la factura de venta: el ítem y el valor base del contrato, y
 * por cada concepto (administración, imprevisto, utilidad) su ítem y su
 * porcentaje, con la vista previa de lo que va a cobrar.
 *
 * Los ítems de cada concepto se precargan de Configuración › Venta › AIU y se
 * pueden cambiar para esta factura. Los porcentajes son, por ahora, los fijos de
 * `AIU_PORCENTAJES_INICIALES` (se muestran bloqueados).
 *
 * No persiste nada: al confirmar **cierra emitiendo las 4 líneas** (`AiuLinea[]`,
 * base primero) por `ref.onClose`; al cancelar emite `null`. Agregarlas a la
 * factura —en alta o en edición— lo hace la tabla de detalles.
 */
@Component({
  selector: 'app-aiu-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    FocusInvalidDirective,
    FieldErrorComponent,
    ErpItemAutocompleteComponent,
  ],
  templateUrl: './aiu-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiuModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ref = inject(DynamicDialogRef);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;
  protected readonly conceptos = AIU_CONCEPTOS;

  /** Leyendo los ítems configurados; los selectores esperan para no parpadear. */
  protected readonly loading = signal(true);

  /**
   * Algún concepto quedó sin ítem en la configuración. No bloquea —se puede
   * elegir aquí—, pero se avisa dónde dejarlo fijo para las próximas facturas.
   */
  protected readonly configIncompleta = signal(false);

  protected readonly form = this.fb.group({
    item_base: this.fb.control<ItemOption | null>(null, Validators.required),
    valor_base: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    administracion: this.conceptoGroup('administracion'),
    imprevisto: this.conceptoGroup('imprevisto'),
    utilidad: this.conceptoGroup('utilidad'),
  });

  private readonly raw = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  /** Valor de cada concepto según lo tecleado (vista previa en vivo). */
  protected readonly valores = computed(() => {
    const raw = this.raw();
    return calcularAiu(raw.valor_base ?? 0, {
      administracion: raw.administracion.porcentaje ?? 0,
      imprevisto: raw.imprevisto.porcentaje ?? 0,
      utilidad: raw.utilidad.porcentaje ?? 0,
    });
  });

  /** Lo que suman las 4 líneas antes de impuestos. */
  protected readonly total = computed(() => {
    const valores = this.valores();
    return redondearMoneda(
      (this.raw().valor_base ?? 0) + valores.administracion + valores.imprevisto + valores.utilidad,
    );
  });

  constructor() {
    this.cargarItemsConfigurados();
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (!raw.item_base || raw.valor_base == null) return;

    const valores = this.valores();
    const lineas: AiuLinea[] = [{ item: raw.item_base, precio: raw.valor_base }];
    for (const concepto of AIU_CONCEPTOS) {
      const item = raw[concepto].item;
      if (!item) return;
      lineas.push({ item, precio: valores[concepto] });
    }
    this.ref.close(lineas);
  }

  protected onCancel(): void {
    this.ref.close(null);
  }

  private conceptoGroup(concepto: AiuConcepto) {
    return this.fb.group({
      item: this.fb.control<ItemOption | null>(null, Validators.required),
      // Bloqueado temporalmente: se cobra el porcentaje fijo hasta que el backend
      // guarde los de la empresa. `getRawValue()` lo sigue leyendo para el cálculo;
      // para volver a abrirlo basta con quitar `disabled`.
      porcentaje: this.fb.control<number | null>(
        { value: AIU_PORCENTAJES_INICIALES[concepto], disabled: true },
        [Validators.required, Validators.min(0), Validators.max(100)],
      ),
    });
  }

  /**
   * Precarga el ítem de cada concepto desde la configuración de la empresa. Si
   * la lectura falla (el interceptor ya avisa), el modal sigue usable eligiendo
   * los ítems a mano.
   */
  private cargarItemsConfigurados(): void {
    this.configuracionService
      .obtener(VENTA_AIU_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          const items = configuracionToVentaAiuForm(config);
          this.form.patchValue({
            administracion: { item: items.item_administracion },
            imprevisto: { item: items.item_imprevisto },
            utilidad: { item: items.item_utilidad },
          });
          this.configIncompleta.set(
            !items.item_administracion || !items.item_imprevisto || !items.item_utilidad,
          );
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
