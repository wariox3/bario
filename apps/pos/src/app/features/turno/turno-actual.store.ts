import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { Subscription } from 'rxjs';
import { TenantService } from '@reddoc/core';
import type { Turno } from './turno.model';
import { TurnoService } from './turno.service';

export type EstadoTurnoActual = 'cargando' | 'listo' | 'error';

/**
 * El turno abierto de quien usa la caja, compartido por toda la app: Vender lo
 * exige para cobrar y lo pone en la factura, el header lo muestra y la página
 * Turno lo abre y lo cierra.
 *
 * Se consulta al entrar a cada empresa (`abierto/`) y lo actualiza quien abre
 * o cierra, sin volver a preguntar. Mientras no se sabe (`cargando`) o la
 * consulta falló (`error`), `turno` es `null` pero eso no significa "sin
 * turno": quien decida algo debe mirar el `estado`.
 */
@Injectable({ providedIn: 'root' })
export class TurnoActualStore {
  private readonly service = inject(TurnoService);
  private readonly tenant = inject(TenantService);

  private readonly _estado = signal<EstadoTurnoActual>('cargando');
  private readonly _turno = signal<Turno | null>(null);
  private slug: string | null = null;
  /** La consulta en vuelo: al cambiar de empresa se descarta la de la anterior. */
  private peticion: Subscription | null = null;

  readonly estado = this._estado.asReadonly();
  readonly turno = this._turno.asReadonly();
  /** Se sabe que hay turno abierto. */
  readonly abierto = computed(() => this._estado() === 'listo' && this._turno() !== null);
  /** Se sabe que no hay turno abierto (no es lo mismo que "no se sabe"). */
  readonly sinTurno = computed(() => this._estado() === 'listo' && this._turno() === null);

  constructor() {
    effect(() => {
      const slug = this.tenant.currentSlug();
      untracked(() => {
        if (slug === this.slug) return;
        this.slug = slug;
        this._turno.set(null);
        if (slug) this.cargar();
      });
    });
  }

  cargar(): void {
    this._estado.set('cargando');
    this.peticion?.unsubscribe();
    this.peticion = this.service.abierto().subscribe({
      next: (turno) => {
        this._turno.set(turno);
        this._estado.set('listo');
      },
      error: () => this._estado.set('error'),
    });
  }

  /** Lo llama quien abre (`turno`) o cierra (`null`) un turno. */
  fijar(turno: Turno | null): void {
    this.peticion?.unsubscribe();
    this._turno.set(turno);
    this._estado.set('listo');
  }
}
