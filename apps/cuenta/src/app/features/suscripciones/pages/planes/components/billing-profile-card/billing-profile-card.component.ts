import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatCiudad } from '@reddoc/core';
import { BillingProfile } from '../../../../models/billing-profile.model';

@Component({
  selector: 'app-billing-profile-card',
  standalone: true,
  templateUrl: './billing-profile-card.component.html',
  host: { class: 'block h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingProfileCardComponent {
  readonly profile = input.required<BillingProfile>();
  readonly selected = input<boolean>(false);

  readonly profileSelected = output<BillingProfile>();
  readonly edit = output<BillingProfile>();
  readonly remove = output<BillingProfile>();

  readonly tipoHint = computed(() =>
    /nit/i.test(this.profile().tipo) ? 'Persona jurídica' : 'Persona natural',
  );

  /** `Amagá — Antioquia`; sin departamento queda solo el nombre. */
  readonly ciudadLabel = computed(() =>
    formatCiudad(this.profile().ciudad, this.profile().departamento),
  );

  onSelect(): void {
    this.profileSelected.emit(this.profile());
  }

  onSelectKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSelect();
    }
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.edit.emit(this.profile());
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit(this.profile());
  }
}
