import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { TenantService } from '@reddoc/core';
import { PosStorageService } from '../../core/storage/pos-storage.service';
import {
  CONFIGURACION_CAJA_VACIA,
  configuracionCompleta,
  esConfiguracionCaja,
  type ConfiguracionCaja,
} from './configuracion-caja.model';

/**
 * Configuración de la caja del tenant activo, persistida en este dispositivo.
 *
 * Se recalcula sola al cambiar de tenant (la clave lleva el slug), así que dos
 * empresas en el mismo navegador no se pisan la configuración.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionCajaStore {
  private readonly tenant = inject(TenantService);
  private readonly storage = inject(PosStorageService);

  private readonly clave = computed(() => {
    const slug = this.tenant.currentSlug();
    return slug ? `pos:config:${slug}` : null;
  });

  private readonly estado = linkedSignal<ConfiguracionCaja>(() => {
    const clave = this.clave();
    if (!clave) return CONFIGURACION_CAJA_VACIA;
    return this.storage.leer(clave, esConfiguracionCaja) ?? CONFIGURACION_CAJA_VACIA;
  });

  readonly configuracion = this.estado.asReadonly();

  /** La caja tiene lo mínimo para vender. */
  readonly completa = computed(() => configuracionCompleta(this.estado()));

  guardar(config: ConfiguracionCaja): void {
    this.estado.set(config);
    const clave = this.clave();
    if (clave) this.storage.escribir(clave, config);
  }
}
