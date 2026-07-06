import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Contenedor, getInitials } from '@reddoc/core';
import {
  getSuscripcionExpiryLabel,
  isSuscripcionExpired,
} from '../../utils/contenedor-suscripcion.utils';

@Component({
  selector: 'app-contenedor-row-item',
  standalone: true,
  imports: [NgClass],
  templateUrl: './contenedor-row-item.component.html',
  styleUrl: './contenedor-row-item.component.scss',
})
export class ContenedorRowItemComponent {
  readonly contenedor = input.required<Contenedor>();
  readonly index = input<number>(0);
  readonly menuLabel = input<string>('Opciones');
  readonly enterLabel = input<string>('Ingresar');
  readonly renewLabel = input<string>('Renovar suscripción');
  readonly memberLockedLabel = input<string>('Pide al propietario que renueve la suscripción');
  readonly expiredBadgeLabel = input<string>('Vencida');

  readonly enter = output<void>();
  readonly renew = output<void>();
  readonly menuOpen = output<Event>();

  readonly avatarLabel = computed(() => getInitials(this.contenedor().nombre));

  readonly frecuenciaLabel = computed(() => {
    const map: Record<string, string> = { P: 'Prueba', M: 'Mensual', A: 'Anual' };
    return map[this.contenedor().suscripcion_frecuencia ?? ''] ?? '';
  });

  readonly expiryLabel = computed(() =>
    getSuscripcionExpiryLabel(this.contenedor().suscripcion_fecha_fin),
  );

  readonly isOwner = computed(() => this.contenedor().rol_id === 1);

  readonly isExpired = computed(() =>
    isSuscripcionExpired(this.contenedor().suscripcion_fecha_fin),
  );

  protected onActivate(): void {
    if (this.isExpired()) {
      if (this.isOwner()) this.renew.emit();
      return;
    }
    this.enter.emit();
  }
}
