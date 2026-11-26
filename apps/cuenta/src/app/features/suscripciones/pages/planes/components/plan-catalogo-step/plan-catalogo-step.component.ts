import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SuscripcionTipo } from '../../../../models/suscripcion-tipo.model';
import { ANNUAL_DISCOUNT } from '../../utils/plan-pricing';
import { PlanCardComponent } from '../plan-card/plan-card.component';

export type PlanTrack = 'facturacion' | 'erp';

/**
 * Paso 1 cuando el plan se elige del catálogo comercial: categoría, frecuencia y grilla de
 * planes. Tonto: la página decide qué planes llegan y guarda la selección.
 */
@Component({
  selector: 'app-plan-catalogo-step',
  standalone: true,
  imports: [PlanCardComponent],
  templateUrl: './plan-catalogo-step.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanCatalogoStepComponent {
  readonly planes = input.required<readonly SuscripcionTipo[]>();
  readonly track = input.required<PlanTrack>();
  readonly annual = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly selectedId = input<number | null>(null);
  readonly currentId = input<number | null>(null);

  readonly trackChange = output<PlanTrack>();
  readonly annualChange = output<boolean>();
  readonly planSelected = output<SuscripcionTipo>();

  readonly skeletonCells = [0, 1, 2, 3];
  readonly descuentoLabel = `Ahorra ${Math.round(ANNUAL_DISCOUNT * 100)}%`;

  esRecomendado(plan: SuscripcionTipo): boolean {
    return plan.nombre.startsWith('Expansión');
  }
}
