import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { duracion } from '../../turno.format';
import { TurnoActualStore } from '../../turno-actual.store';

/** Cada cuánto se refresca el tiempo corrido: el chip muestra minutos. */
const TIC_MS = 30_000;

/**
 * El turno en el header, a la vista desde cualquier pantalla (sobre todo desde
 * Vender): con turno, el punto verde y cuánto lleva; sin turno, un chip
 * punteado que avisa. Lleva a la página Turno. Mientras no se sabe, no pinta
 * nada: no hay un estado que mostrar todavía.
 */
@Component({
  selector: 'app-turno-chip',
  standalone: true,
  host: { class: 'contents' },
  imports: [RouterLink],
  templateUrl: './turno-chip.component.html',
})
export class TurnoChipComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;
  protected readonly actual = inject(TurnoActualStore);

  private readonly ahora = signal(Date.now());

  protected readonly ruta = computed(() => `/t/${this.tenant.currentSlug() ?? ''}/turno`);
  protected readonly corrido = computed(() => {
    const turno = this.actual.turno();
    return turno ? duracion(turno.fecha_apertura, this.ahora()) : '';
  });
  protected readonly titulo = computed(() => {
    const turno = this.actual.turno();
    return turno ? [turno.caja_nombre, turno.caja_sede_nombre].filter(Boolean).join(' · ') : '';
  });

  constructor() {
    const tic = setInterval(() => this.ahora.set(Date.now()), TIC_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(tic));
  }
}
