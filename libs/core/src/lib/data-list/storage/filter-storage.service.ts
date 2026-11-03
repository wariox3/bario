import { Injectable, inject } from '@angular/core';
import { TenantService } from '../../tenant/tenant.service';
import type { FilterCondition } from '../data/list-query.types';

/**
 * Persistencia de filtros del usuario en `localStorage`, separada por tenant.
 *
 * El consumidor pasa una clave que describe **solo el recurso**
 * (`'contratos:filters:v1'`, o derivada de un descriptor de entidad) y el
 * servicio le antepone el slug del tenant activo: `acme:contratos:filters:v1`.
 * Así los filtros aplicados en un contenedor no aparecen en otro. No pongas el
 * tenant en la clave: ya lo hace el servicio.
 *
 * Convención de la clave: `<scope>:<resource>:v<schemaVersion>`. Incrementar
 * la versión cuando cambie el shape de filtros para invalidar storage obsoleto
 * sin afectar al usuario.
 *
 * Manejo de errores:
 *  - Sin tenant activo, o si `localStorage` no está disponible (SSR, ventana
 *    privada, almacenamiento lleno), las operaciones son no-op.
 *  - Si el JSON guardado está corrupto, se descarta silenciosamente y se
 *    devuelve lista vacía.
 *  - La clave sin tenant de versiones anteriores se borra al leer: no se puede
 *    saber de qué contenedor era, así que no se migra.
 */
@Injectable({ providedIn: 'root' })
export class FilterStorageService {
  private readonly tenant = inject(TenantService);

  read(storageKey: string): readonly FilterCondition[] {
    // Clave de antes de separar por tenant: no se sabe de qué contenedor era.
    this.remove(storageKey);
    const key = this.scopedKey(storageKey);
    if (!key) return [];

    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return [];
    }
    if (!raw) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.remove(key);
        return [];
      }
      return parsed as FilterCondition[];
    } catch {
      this.remove(key);
      return [];
    }
  }

  write(storageKey: string, filters: readonly FilterCondition[]): void {
    const key = this.scopedKey(storageKey);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(filters));
    } catch {
      // Sin almacenamiento disponible el listado sigue, solo que no recuerda.
    }
  }

  clear(storageKey: string): void {
    const key = this.scopedKey(storageKey);
    if (key) this.remove(key);
  }

  /** Clave real en `localStorage`, o `null` si no hay tenant activo. */
  private scopedKey(storageKey: string): string | null {
    const slug = this.tenant.currentSlug();
    return slug ? `${slug}:${storageKey}` : null;
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Si tampoco podemos limpiar, no hay más que hacer.
    }
  }
}
