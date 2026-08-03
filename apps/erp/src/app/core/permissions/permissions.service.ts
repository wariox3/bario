import { Injectable, computed, inject } from '@angular/core';
import { TenantService } from '@reddoc/core';
import { ERP_MODULES } from '@erp/core/erp-modules';
import { ROL_ADMIN_IDS } from './contenedor-rol.constants';

/**
 * Decide qué módulos del ERP son accesibles para el tenant activo.
 *
 * Implementación inicial: retorna todos los módulos registrados. El backend
 * todavía no expone flags `plan_compra`, `plan_venta`, etc. en `Contenedor`.
 * Cuando los exponga, este `computed` filtra `ERP_MODULES` contra el
 * contenedor activo — el contrato del servicio no cambia.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly tenant = inject(TenantService);

  readonly enabledModuleIds = computed<ReadonlySet<string>>(() => {
    // Tocamos el signal para que el computed se recalcule cuando cambia de tenant.
    // En el futuro: leer flags `plan_*` del contenedor y filtrar.
    this.tenant.currentSlug();
    return new Set(ERP_MODULES.map((m) => m.id));
  });

  canAccessModule(id: string): boolean {
    return this.enabledModuleIds().has(id);
  }

  /**
   * ¿El usuario administra el contenedor activo (propietario o administrador)?
   *
   * Gobierna todo lo que sea administrar el contenedor en sí —hoy la pantalla de
   * Seguridad— y no depende del backend: el rol ya viaja en el contenedor activo,
   * que `tenantAccessGuard` repuebla antes de pintar (sobrevive reload duro).
   *
   * Sin contenedor en memoria responde `false`: mejor esconder de más que
   * mostrar una pantalla de administración a quien no le toca.
   */
  readonly isContenedorAdmin = computed<boolean>(() => {
    const rolId = this.tenant.currentContenedor()?.rol_id;
    return rolId != null && ROL_ADMIN_IDS.has(rolId);
  });
}
