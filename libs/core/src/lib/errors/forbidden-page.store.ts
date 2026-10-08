import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * La pantalla actual quedó **bloqueada por un 403** del backend.
 *
 * Un 403 al cargar el listado de una pantalla no es un aviso: es que la pantalla
 * entera no aplica. Un toast solo (que es lo que había) deja al usuario mirando
 * un contenido vacío sin saber si es que no hay datos, si falló la red o si no
 * le corresponde verlo — los tres se ven idénticos.
 *
 * Lo escribe el `errorInterceptor` y lo lee el layout de cada app, que rinde el
 * estado de acceso denegado en lugar del contenido. El mensaje es **el que mandó
 * el backend**: el front no inventa el motivo.
 *
 * Se limpia solo en cada navegación: el bloqueo pertenece a la pantalla que lo
 * provocó, no a la sesión.
 */
@Injectable({ providedIn: 'root' })
export class ForbiddenPageStore {
  private readonly _message = signal<string | null>(null);

  /** Motivo del 403, o `null` si la pantalla actual no está bloqueada. */
  readonly message = this._message.asReadonly();

  readonly isBlocked = computed(() => this._message() !== null);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this._message.set(null));
  }

  block(message: string): void {
    this._message.set(message);
  }

  clear(): void {
    this._message.set(null);
  }
}
