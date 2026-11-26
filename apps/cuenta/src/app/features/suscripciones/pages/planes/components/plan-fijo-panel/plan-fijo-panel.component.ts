import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { getInitials } from '@reddoc/core';
import { SuscripcionTipo } from '../../../../models/suscripcion-tipo.model';
import {
  ANNUAL_DISCOUNT,
  annualTotal,
  displayedMonthly,
  formatCop,
  tienePrecio,
} from '../../utils/plan-pricing';

/**
 * Plan que no se elige del catálogo (personalizado, contador): se renueva el mismo, así que
 * la única decisión es la frecuencia y es lo que el panel ofrece como opciones.
 */
@Component({
  selector: 'app-plan-fijo-panel',
  standalone: true,
  templateUrl: './plan-fijo-panel.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanFijoPanelComponent {
  readonly plan = input.required<SuscripcionTipo>();
  readonly etiqueta = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly annual = input<boolean>(false);

  readonly annualChange = output<boolean>();

  readonly sinPrecio = computed(() => !tienePrecio(this.plan().precio));
  readonly iniciales = computed(() => getInitials(this.plan().nombre));
  readonly descuentoLabel = `Ahorra ${Math.round(ANNUAL_DISCOUNT * 100)}%`;

  readonly mensualLabel = computed(() => formatCop(displayedMonthly(this.plan().precio, false)));
  readonly anualMensualLabel = computed(() =>
    formatCop(displayedMonthly(this.plan().precio, true)),
  );
  readonly anualTotalLabel = computed(() => formatCop(annualTotal(this.plan().precio)));

  elegir(annual: boolean): void {
    if (annual !== this.annual()) this.annualChange.emit(annual);
  }
}
