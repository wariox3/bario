import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  RESOLUCION_ACTIVA_PARAMS,
  SELECT_ENDPOINTS,
  ToastService,
  extractErrorMessage,
  resolucionLabel,
  type DocumentEntityConfig,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  ErpApiSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  MascaraFechaDirective,
} from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { DocumentoElectronicoEmisionService } from '@erp/core/documento-electronico';
import { vencimientoAnteriorAFecha } from '@erp/features/documentos/comercial/vencimiento-autocompute';
import {
  aCabeceraElectronica,
  cambiosCabeceraElectronica,
  type CabeceraElectronica,
  type CorregirElectronicoRead,
} from '../../corregir-electronico';

const RESOLUCION_ENDPOINT = '/general/resolucion/seleccionar/';

/**
 * Diálogo **Corregir** del dropdown "Electrónico" —la corrección **DIAN**—:
 * número, resolución, fecha, vencimiento y —en las notas— concepto de corrección
 * de un documento aprobado que todavía
 * no salió hacia la DIAN, típicamente para reintentar una emisión rechazada.
 * Sin líneas: lo contable (sede y líneas) lo corrige el "Corregir" de Opciones
 * (`CorregirDocumentoDialogComponent`).
 *
 * Lee la cabecera por `ENTITY_DATA_GATEWAY` (endpoint del config del
 * documento) y guarda con un solo `actualizar-electronico/` con lo que cambió.
 */
@Component({
  selector: 'app-corregir-electronico-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
    MascaraFechaDirective,
  ],
  templateUrl: './corregir-electronico-dialog.component.html',
  styleUrl: './corregir-electronico-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorregirElectronicoDialogComponent {
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly electronico = inject(DocumentoElectronicoEmisionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la abre el dropdown "Electrónico". */
  readonly visible = model<boolean>(false);
  readonly documentoId = input<number | null>(null);
  /** Documento activo: de su config salen el endpoint de lectura y el filtro de resoluciones. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Se guardó la corrección: la ficha debe recargarse. */
  readonly corregido = output<void>();

  protected readonly resolucionEndpoint = RESOLUCION_ENDPOINT;
  protected readonly resolucionLabel = resolucionLabel;
  /** Solo las activas del módulo del documento. */
  protected readonly resolucionParams = computed(() => ({
    ...RESOLUCION_ACTIVA_PARAMS,
    ...this.document().electronico?.resolucionParams,
  }));

  protected readonly conceptoCorreccionEndpoint = SELECT_ENDPOINTS.conceptoCorreccion;
  /**
   * Clase de nota con que se filtran los conceptos de corrección (la declara el
   * config); `null` ⇒ el documento no es nota y el diálogo no muestra el campo.
   */
  protected readonly conceptoCorreccionClaseId = computed(
    () => this.document().conceptoCorreccionClaseId ?? null,
  );
  protected readonly conceptoCorreccionParams = computed(() => ({
    documento_clase_id: String(this.conceptoCorreccionClaseId()),
  }));

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadFailed = signal(false);
  private readonly original = signal<CabeceraElectronica | null>(null);

  protected readonly form = this.fb.group({
    numero: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    resolucion: this.fb.control<ErpSelectOption | null>(null),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    fechaVence: this.fb.control<Date | null>(null),
    conceptoCorreccion: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    const { fecha, fechaVence } = this.form.controls;
    fechaVence.addValidators(vencimientoAnteriorAFecha(fecha));
    // La regla del vencimiento depende de la fecha: se reevalúa cuando esta cambia.
    fecha.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => fechaVence.updateValueAndValidity({ emitEvent: false }));

    // Se consulta cada vez que se abre: la corrección parte de lo vigente.
    effect(() => {
      if (!this.visible()) return;
      const id = untracked(this.documentoId);
      if (id == null) return;
      untracked(() => this.load(id));
    });
  }

  protected onVisibleChange(value: boolean): void {
    if (!value && this.isSaving()) return;
    this.visible.set(value);
  }

  protected onCancel(): void {
    if (this.isSaving()) return;
    this.visible.set(false);
  }

  protected onSubmit(): void {
    const id = this.documentoId();
    const original = this.original();
    if (id == null || !original || this.isSaving()) return;
    if (this.form.invalid) return;

    const ts = this.t().documentActions.electronico.corregir.toasts;
    const patch = cambiosCabeceraElectronica(original, this.form.getRawValue());
    if (!patch) {
      this.toast.info(ts.sinCambios.title, ts.sinCambios.desc);
      this.visible.set(false);
      return;
    }

    this.isSaving.set(true);
    this.electronico
      .actualizarElectronico(id, patch)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(ts.success.title, ts.success.desc);
          this.corregido.emit();
          this.visible.set(false);
        },
        error: (err: unknown) => {
          this.toast.error(ts.error.title, extractErrorMessage(err, ts.error.desc));
        },
      });
  }

  private load(id: number): void {
    // En las notas el concepto es obligatorio (en la crédito lo exige también el backend).
    const concepto = this.form.controls.conceptoCorreccion;
    if (this.conceptoCorreccionClaseId() != null) concepto.setValidators(Validators.required);
    else concepto.clearValidators();

    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.gateway
      .getById(this.document(), id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (read) => {
          const cabecera = aCabeceraElectronica(read as CorregirElectronicoRead);
          this.original.set(cabecera);
          this.form.reset(cabecera);
        },
        error: () => {
          this.loadFailed.set(true);
          const ts = this.t().documentActions.electronico.corregir.toasts.loadError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }
}
