import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MascaraFechaDirective } from '@reddoc/ui';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, startOfToday } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Textos del modal. Cada acción que lo abre pasa los suyos por
 * `DialogService.open(..., { data })`; sin `data` caen los de la acción
 * "generar" (contratos → pedidos), que fue la primera en usarlo.
 */
export interface GenerarDocumentoModalTexts {
  readonly modalHeader: string;
  readonly modalSubtitle: string;
  readonly periodoLabel: string;
  readonly submit: string;
  readonly cancel: string;
  readonly warning?: string;
  /**
   * Si viene, el modal suma el check «validar fechas» (marcado por defecto).
   * Solo lo usan las acciones de plantillas recurrentes.
   */
  readonly validarFechasLabel?: string;
  readonly validarFechasHint?: string;
}

/** Lo que emite el modal al confirmar por `ref.onClose`. */
export interface GenerarDocumentoModalResult {
  readonly periodo: Date;
  /** `true` si el modal no muestra el check. */
  readonly validarFechas: boolean;
}

/**
 * Modal de las acciones que generan documentos por período: un único selector
 * de mes/año.
 *
 * Se abre con `DialogService.open(...)` desde un `EntityActionStrategy`. No
 * conoce el endpoint ni el payload: al confirmar cierra el dialog emitiendo un
 * `GenerarDocumentoModalResult` por `ref.onClose`; al cancelar emite `null`. El
 * strategy es quien deriva el mes y el año a partir del período.
 */
@Component({
  selector: 'app-generar-documento-modal',
  standalone: true,
  imports: [
    FormsModule,
    CheckboxModule,
    DatePickerModule,
    MascaraFechaDirective,
    ButtonModule,
    TooltipModule,
  ],
  templateUrl: './generar-documento-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerarDocumentoModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<GenerarDocumentoModalTexts | undefined>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly texts = computed<GenerarDocumentoModalTexts>(
    () => this.config.data ?? this.i18n.t().documentActions.generar,
  );

  /** Período seleccionado (ancla mes/año); arranca en el mes actual. */
  protected readonly periodo = signal<Date | null>(startOfToday());

  protected readonly validarFechas = signal(true);

  protected confirm(): void {
    const periodo = this.periodo();
    if (!periodo) return;
    const result: GenerarDocumentoModalResult = { periodo, validarFechas: this.validarFechas() };
    this.ref.close(result);
  }

  protected cancel(): void {
    this.ref.close(null);
  }
}
