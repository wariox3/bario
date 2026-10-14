import { Injectable } from '@angular/core';

/**
 * Persistencia local de la caja (configuración, carritos…) en `localStorage`.
 *
 * Todo lo que el POS guarda aquí es del **dispositivo**: cada caja física tiene
 * su sede, su almacén y sus ventas abiertas. Por eso las claves llevan el tenant
 * (`pos:<qué>:<slug>`) y nada de esto viaja al backend.
 *
 * Ninguna operación lanza: en una ventana privada o con el almacenamiento lleno
 * `localStorage` puede tirar, y la caja tiene que seguir funcionando aunque no
 * recuerde nada. Lo leído se valida con un type guard: un valor de una versión
 * anterior o editado a mano se descarta en vez de romper la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class PosStorageService {
  /** Lee y valida un JSON. Devuelve `null` si no existe, no parsea o no pasa el guard. */
  leer<T>(clave: string, esValido: (valor: unknown) => valor is T): T | null {
    try {
      const raw = localStorage.getItem(clave);
      if (raw === null) return null;
      const valor: unknown = JSON.parse(raw);
      if (esValido(valor)) return valor;
      localStorage.removeItem(clave);
      return null;
    } catch {
      return null;
    }
  }

  /** Guarda un valor como JSON. Si el navegador no deja escribir, no hace nada. */
  escribir(clave: string, valor: unknown): void {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento disponible la caja sigue, solo que no recuerda.
    }
  }
}
