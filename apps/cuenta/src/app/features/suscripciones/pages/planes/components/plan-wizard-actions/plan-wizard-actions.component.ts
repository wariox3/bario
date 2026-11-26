import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BillingProfile } from '../../../../models/billing-profile.model';
import { SuscripcionTipo } from '../../../../models/suscripcion-tipo.model';

export type PlanWizardStep = 0 | 1 | 2;

/**
 * Barra inferior del asistente: volver, el resumen corto del paso y la acción principal.
 * En el último paso la acción depende de si el saldo cubre el cambio (actualizar sin pago)
 * o hay que pagar en Wompi.
 */
@Component({
  selector: 'app-plan-wizard-actions',
  standalone: true,
  templateUrl: './plan-wizard-actions.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanWizardActionsComponent {
  readonly step = input.required<PlanWizardStep>();
  readonly canGoNext = input<boolean>(false);
  readonly plan = input<SuscripcionTipo | null>(null);
  readonly montoMensualLabel = input<string>('');
  /** El plan elegido no tiene precio: el paso 1 no avanza y se dice por qué. */
  readonly planSinPrecio = input<boolean>(false);
  readonly billingProfile = input<BillingProfile | null>(null);
  readonly annual = input<boolean>(false);
  readonly cubiertoConSaldo = input<boolean>(false);
  readonly enviando = input<boolean>(false);

  readonly volver = output<void>();
  readonly continuar = output<void>();
  readonly confirmar = output<void>();
}
