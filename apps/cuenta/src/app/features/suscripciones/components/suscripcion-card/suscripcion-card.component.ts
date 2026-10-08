import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { getInitials, FORMATO_FECHA } from '@reddoc/core';
import { ButtonModule } from 'primeng/button';
import { Suscripcion } from '../../models/suscripcion.model';
import {
  formatSuscripcionId,
  formatSuscripcionPct,
  getSuscripcionFrecuenciaLabel,
  getSuscripcionStatus,
} from '../../suscripcion.utils';

@Component({
  selector: 'app-suscripcion-card',
  standalone: true,
  imports: [DatePipe, ButtonModule],
  templateUrl: './suscripcion-card.component.html',
})
export class SuscripcionCardComponent {
  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angular;

  private readonly router = inject(Router);

  readonly suscripcion = input.required<Suscripcion>();

  readonly status = computed(() => getSuscripcionStatus(this.suscripcion()));
  readonly initials = computed(() => getInitials(this.suscripcion().cliente_nombre));
  readonly frecuenciaLabel = computed(() =>
    getSuscripcionFrecuenciaLabel(this.suscripcion().frecuencia),
  );
  readonly padId = computed(() => formatSuscripcionId(this.suscripcion().id));
  readonly pctLabel = computed(() => formatSuscripcionPct(this.status().pct));

  goToPlanes(): void {
    this.router.navigate(['/suscripciones/planes', this.suscripcion().id], {
      state: { suscripcion: this.suscripcion() },
    });
  }
}
