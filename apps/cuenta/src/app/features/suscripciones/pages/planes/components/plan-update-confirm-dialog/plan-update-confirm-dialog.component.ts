import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PeriodoPago } from '../../../../models/pago.model';
import { Suscripcion } from '../../../../models/suscripcion.model';
import { SuscripcionTipo } from '../../../../models/suscripcion-tipo.model';
import {
  formatSuscripcionFechaFin,
  getSuscripcionFrecuenciaLabel,
} from '../../../../suscripcion.utils';
import { formatCop } from '../../utils/plan-pricing';
import { formatFechaCorta } from '@reddoc/core';

@Component({
  selector: 'app-plan-update-confirm-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './plan-update-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanUpdateConfirmDialogComponent {
  readonly visible = input<boolean>(false);
  readonly suscripcionActual = input.required<Suscripcion>();
  readonly planNuevo = input.required<SuscripcionTipo>();
  readonly periodoNuevo = input.required<PeriodoPago>();
  readonly saldoNoConsumido = input<number>(0);
  readonly costoNuevoPlan = input<number>(0);
  readonly isSubmitting = input<boolean>(false);

  readonly visibleChange = output<boolean>();
  readonly confirm = output<void>();

  readonly planActualNombre = computed(() => this.suscripcionActual().suscripcion_tipo_nombre);
  readonly planActualFrecuencia = computed(() =>
    getSuscripcionFrecuenciaLabel(this.suscripcionActual().frecuencia),
  );
  readonly planActualVencimiento = computed(() =>
    formatSuscripcionFechaFin(this.suscripcionActual().fecha_fin),
  );
  readonly saldoLabel = computed(() => formatCop(this.saldoNoConsumido()));

  readonly planNuevoFrecuencia = computed(() =>
    this.periodoNuevo() === 'A' ? 'Anual' : 'Mensual',
  );

  readonly vigenciaInicio = computed(() => formatHumanDate(new Date()));

  readonly vigenciaFin = computed(() => {
    const fin = new Date();
    if (this.periodoNuevo() === 'A') {
      fin.setFullYear(fin.getFullYear() + 1);
    } else {
      fin.setMonth(fin.getMonth() + 1);
    }
    return formatHumanDate(fin);
  });

  readonly sobrante = computed(() => Math.max(this.saldoNoConsumido() - this.costoNuevoPlan(), 0));

  readonly sobranteLabel = computed(() => formatCop(this.sobrante()));

  readonly mostrarAvisoSobrante = computed(() => this.sobrante() > 0);

  onCancel(): void {
    if (this.isSubmitting()) return;
    this.visibleChange.emit(false);
  }

  onConfirm(): void {
    if (this.isSubmitting()) return;
    this.confirm.emit();
  }
}

function formatHumanDate(date: Date): string {
  return formatFechaCorta(date);
}
