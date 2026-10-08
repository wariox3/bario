import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService, TenantService } from '@reddoc/core';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import {
  ACCESS_DENIED_VARIANT_KEY,
  type AccessDeniedVariant,
} from '@erp/core/permissions/access-denied-route';
import type { AppDict } from '@erp/i18n';
import { AccessDeniedComponent } from './access-denied.component';

/**
 * Página de acceso denegado, montada por las rutas gemelas de `withPermission`
 * y `withModuleAccess`, y por el layout cuando el backend responde 403.
 *
 * Llega acá con **la URL intacta**. Eso importa más de lo que parece: el usuario
 * pegó un link que le pasó un compañero, y si lo rebotamos al inicio no puede
 * reenviárselo al admin para pedir acceso, ni nosotros reproducir el reporte.
 *
 * El texto depende de por qué se rechazó, porque la salida del usuario es
 * distinta en cada caso: un permiso se lo da el administrador del contenedor, un
 * módulo fuera del plan se resuelve con quien contrata. El motivo viaja en el
 * `data` de la ruta; un `message` explícito (el que manda el backend en un 403)
 * gana sobre ambos, porque ahí el porqué no lo inventamos nosotros.
 */
@Component({
  selector: 'app-access-denied-page',
  standalone: true,
  imports: [AccessDeniedComponent],
  template: `<app-access-denied [message]="resolvedMessage()" [backLink]="backLink()" />`,
  host: { class: 'flex flex-1' },
})
export class AccessDeniedPageComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly route = inject(ActivatedRoute);

  /** Motivo tal como lo mandó el backend. Vacío → texto según el `variant`. */
  readonly message = input<string>('');

  private readonly variant: AccessDeniedVariant =
    this.route.snapshot.data[ACCESS_DENIED_VARIANT_KEY] === 'modulo' ? 'modulo' : 'permiso';

  protected readonly resolvedMessage = computed(() => {
    const fromBackend = this.message();
    if (fromBackend) return fromBackend;

    const dict = this.i18n.t().common.accessDenied;
    return this.variant === 'modulo' ? dict.subModule : dict.subPermission;
  });

  /**
   * Salida al inicio del módulo activo; si no hay módulo o no declara landing,
   * a la raíz del tenant. Sin tenant no se dibuja el botón: no hay a dónde ir.
   */
  protected readonly backLink = computed<readonly string[] | null>(() => {
    const slug = this.tenant.currentSlug();
    if (!slug) return null;

    const descriptor = this.activeModule.activeDescriptor();
    if (!descriptor?.defaultChildPath) return ['/t', slug];
    return ['/t', slug, descriptor.id, descriptor.defaultChildPath];
  });
}
