import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService, startOfToday } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Modal de la acción "generar nómina electrónica": un único selector de mes/año.
 *
 * El ERP anterior usaba dos `<input type="number">` sueltos —uno para el año y
 * otro para el mes— que dejaban escribir mes 13 o año 20024. Acá es el mismo
 * datepicker de mes que usa la acción "generar" de venta: mismo dato, sin
 * validaciones que escribir.
 *
 * No conoce el endpoint ni el payload: al confirmar cierra el dialog emitiendo
 * el `Date` elegido por `ref.onClose`; al cancelar emite `null`.
 */
@Component({
  selector: 'app-generar-nomina-electronica-modal',
  standalone: true,
  imports: [FormsModule, DatePickerModule, ButtonModule],
  templateUrl: './generar-nomina-electronica-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerarNominaElectronicaModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Periodo seleccionado (ancla mes/año); arranca en el mes actual. */
  protected readonly periodo = signal<Date | null>(startOfToday());

  protected confirm(): void {
    const periodo = this.periodo();
    if (!periodo) return;
    this.ref.close(periodo);
  }

  protected cancel(): void {
    this.ref.close(null);
  }
}
