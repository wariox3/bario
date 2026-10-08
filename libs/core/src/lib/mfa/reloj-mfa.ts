import { DestroyRef, Signal, computed, inject, signal } from '@angular/core';
import { MFA_CODIGO_VIGENCIA_SEGUNDOS, MFA_REENVIO_ESPERA_SEGUNDOS } from './mfa.constants';

/**
 * Los dos relojes del segundo factor: cuánto le queda de vida al código y cuánto falta
 * para poder pedir otro.
 *
 * Son **dos marcas distintas** a propósito, y la diferencia es la que se venía perdiendo
 * al escribirlo a mano en cada pantalla:
 *
 * - Donde reenviar trae un código nuevo (configurar/), las dos marcas se mueven juntas:
 *   `marcarDesafio()`.
 * - Donde reenviar es otro correo con el MISMO desafío (el login), la vigencia **no** se
 *   reinicia: solo `marcarEnvio()`.
 *
 * Vive en el padre, no en el modal: así sigue corriendo aunque la vista se cierre, que es
 * lo que evita que cerrar y reabrir regale un código nuevo.
 */
export class RelojMfa {
  private readonly ahora = signal(Date.now());
  private readonly desafioEn = signal(0);
  private readonly envioEn = signal(0);
  private intervalo: ReturnType<typeof setInterval> | null = null;

  /** Segundos de vida que le quedan al código. */
  readonly restante: Signal<number>;
  /** Segundos que faltan para poder pedir otro. `0` = ya se puede. */
  readonly esperaReenvio: Signal<number>;

  constructor(destroyRef: DestroyRef) {
    this.restante = computed(() =>
      Math.max(0, MFA_CODIGO_VIGENCIA_SEGUNDOS - this.segundosDesde(this.desafioEn())),
    );
    this.esperaReenvio = computed(() =>
      Math.max(0, MFA_REENVIO_ESPERA_SEGUNDOS - this.segundosDesde(this.envioEn())),
    );
    destroyRef.onDestroy(() => this.detener());
  }

  /** Desafío nuevo: código nuevo y espera de reenvío desde cero. */
  marcarDesafio(): void {
    const ahora = Date.now();
    this.desafioEn.set(ahora);
    this.envioEn.set(ahora);
    this.arrancar();
  }

  /** Otro envío del MISMO desafío: solo se reinicia la espera entre correos. */
  marcarEnvio(): void {
    this.envioEn.set(Date.now());
    this.arrancar();
  }

  /** No hay nada en curso: las dos marcas se borran y el reloj se apaga. */
  reiniciar(): void {
    this.detener();
    this.desafioEn.set(0);
    this.envioEn.set(0);
  }

  detener(): void {
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  /**
   * Sin marca no hay nada transcurrido. Deja `restante` en su valor máximo, no en 0: el
   * padre decide si hay algo en curso, y un `0` acá se leería como "vencido".
   */
  private segundosDesde(marca: number): number {
    return marca === 0 ? 0 : Math.floor((this.ahora() - marca) / 1000);
  }

  private arrancar(): void {
    this.ahora.set(Date.now());
    if (this.intervalo !== null) return;
    this.intervalo = setInterval(() => {
      this.ahora.set(Date.now());
      // Con las dos cuentas en cero no queda nada que contar: se apaga solo.
      if (this.restante() === 0 && this.esperaReenvio() === 0) this.detener();
    }, 1000);
  }
}

/**
 * Crea el reloj y lo ata al ciclo de vida de quien lo pide. Llamar en contexto de
 * inyección (field initializer o constructor).
 */
export function crearRelojMfa(): RelojMfa {
  return new RelojMfa(inject(DestroyRef));
}
