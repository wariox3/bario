import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { getInitials } from '@reddoc/core';
import { Suscripcion } from '../../../../models/suscripcion.model';
import {
  formatSuscripcionFechaFin,
  getSuscripcionFrecuenciaLabel,
  getSuscripcionStatus,
} from '../../../../suscripcion.utils';
import { calcularSaldoNoConsumido } from '../../../../utils/cambio-plan';
import { formatCop } from '../../utils/plan-pricing';

/** Cabecera de contexto: a qué cliente y suscripción vigente se le está cambiando el plan. */
@Component({
  selector: 'app-suscripcion-actual-header',
  standalone: true,
  templateUrl: './suscripcion-actual-header.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuscripcionActualHeaderComponent {
  readonly suscripcion = input.required<Suscripcion>();

  readonly iniciales = computed(() => getInitials(this.suscripcion().cliente_nombre));

  readonly estadisticas = computed(() => {
    const s = this.suscripcion();
    const status = getSuscripcionStatus(s);
    return {
      daysLeft: status.left,
      tone: status.tone,
      expired: status.expired,
      fechaFin: formatSuscripcionFechaFin(s.fecha_fin),
      frecuenciaLabel: getSuscripcionFrecuenciaLabel(s.frecuencia),
      saldoRestante: formatCop(calcularSaldoNoConsumido(s)),
    };
  });
}
