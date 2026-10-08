import { Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Contenedor, getInitials } from '@reddoc/core';
import {
  getSuscripcionExpiryLabel,
  isSuscripcionExpired,
} from '../../utils/contenedor-suscripcion.utils';

@Component({
  selector: 'lib-contenedor-row-item',
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
  readonly ownerLabel = input<string>('Propietario');
  readonly memberLabel = input<string>('Miembro');
  readonly creatingLabel = input<string>('Creando…');
  readonly errorLabel = input<string>('No se pudo crear');
  /** Muestra el botón de acciones de fila. La app lo apaga si no habilita ninguna. */
  readonly showMenu = input<boolean>(true);
  /** Muestra el CTA de renovación al propietario con la suscripción vencida. */
  readonly canRenew = input<boolean>(true);

  readonly enter = output<void>();
  readonly renew = output<void>();
  readonly menuOpen = output<Event>();

  readonly avatarLabel = computed(() => getInitials(this.contenedor().cliente_nombre));

  readonly frecuenciaLabel = computed(() => {
    const map: Record<string, string> = { P: 'Prueba', M: 'Mensual', A: 'Anual' };
    return map[this.contenedor().suscripcion_frecuencia ?? ''] ?? '';
  });

  readonly expiryLabel = computed(() =>
    getSuscripcionExpiryLabel(this.contenedor().suscripcion_fecha_fin),
  );

  readonly isOwner = computed(() => this.contenedor().propietario);

  readonly isExpired = computed(() =>
    isSuscripcionExpired(this.contenedor().suscripcion_fecha_fin),
  );

  readonly isCreando = computed(() => this.contenedor().estado === 'creando');

  readonly isError = computed(() => this.contenedor().estado === 'error');

  /** Mientras se crea no hay acciones: el menú vuelve cuando termina (o falla). */
  readonly menuDisabled = computed(() => !this.isOwner() || this.isCreando());

  protected onActivate(): void {
    // Hasta estar `listo`, el backend responde 409 a cualquier petición del tenant.
    if (this.contenedor().estado !== 'listo') return;
    if (this.isExpired()) {
      if (this.isOwner() && this.canRenew()) this.renew.emit();
      return;
    }
    this.enter.emit();
  }
}
