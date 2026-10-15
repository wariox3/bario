import { Injectable, signal } from '@angular/core';

/**
 * - `verificando`: todavía no se sabe si la caja está libre (un instante).
 * - `activa`: esta pestaña tiene la caja de la empresa.
 * - `ocupada`: otra pestaña del mismo navegador la tiene; esta espera en fila.
 */
export type EstadoPestana = 'verificando' | 'activa' | 'ocupada';

/**
 * Una sola pestaña del POS por empresa y navegador.
 *
 * Las ventas abiertas se guardan en `localStorage` como un solo bloque por
 * tenant (`pos:carritos:<slug>`): dos pestañas escribiéndolo a la vez se pisan,
 * y la última escritura borra ventas —o un cobro pendiente con su documento—
 * de la otra. Para evitarlo, cada pestaña reserva la caja con la Web Locks API:
 *
 * - Si está libre, la toma y la retiene mientras siga en esa empresa.
 * - Si no, queda `ocupada` y espera en fila: cuando la otra pestaña se cierra
 *   (o cambia de empresa) el navegador le pasa la caja sola, sin recargar.
 *
 * El navegador suelta el lock al cerrar la pestaña, aunque se cierre de golpe.
 * Sin Web Locks (navegadores muy viejos) no se bloquea nada.
 */
@Injectable({ providedIn: 'root' })
export class PestanaUnicaService {
  private readonly estadoInterno = signal<EstadoPestana>('verificando');
  readonly estado = this.estadoInterno.asReadonly();

  /** Suelta la reserva actual (o deja de esperarla). */
  private soltarActual: (() => void) | null = null;

  /** Reserva la caja de la empresa `slug`; suelta la de la empresa anterior. */
  reclamar(slug: string): void {
    this.soltar();
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (!locks) {
      this.estadoInterno.set('activa');
      return;
    }

    let vigente = true;
    let liberar: () => void = () => undefined;
    const retener = new Promise<void>((resolve) => (liberar = resolve));
    const abortar = new AbortController();
    this.soltarActual = () => {
      vigente = false;
      abortar.abort();
      liberar();
    };

    // El lock se retiene mientras la promesa del callback no se resuelva.
    const tomar = (): Promise<void> => {
      if (vigente) this.estadoInterno.set('activa');
      return retener;
    };
    const nombre = `pos:caja:${slug}`;

    this.estadoInterno.set('verificando');
    locks
      .request(nombre, { ifAvailable: true }, (lock) => {
        if (lock) return tomar();
        if (vigente) this.estadoInterno.set('ocupada');
        locks.request(nombre, { signal: abortar.signal }, tomar).catch(ignorar);
        return undefined;
      })
      .catch(ignorar);
  }

  soltar(): void {
    this.soltarActual?.();
    this.soltarActual = null;
  }
}

/** Abortar la espera rechaza la petición: es lo esperado, no un error. */
function ignorar(): void {
  // nada que hacer
}
