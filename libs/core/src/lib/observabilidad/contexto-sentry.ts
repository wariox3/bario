import { effect, inject } from '@angular/core';
import * as Sentry from '@sentry/angular';
import { AUTH_SERVICE } from '../tokens';
import { TenantService } from '../tenant/tenant.service';

/**
 * Mantiene el contexto de Sentry al día con la sesión: cada error queda
 * etiquetado con el tenant activo y el id del usuario, para encontrar los
 * eventos de una empresa filtrando por su slug.
 *
 * Solo el id: ni correo ni nombre salen del navegador.
 */
export function sincronizarContextoSentry(): void {
  const auth = inject(AUTH_SERVICE);
  const tenant = inject(TenantService);

  effect(() => {
    const usuario = auth.currentUser();
    Sentry.setUser(usuario ? { id: String(usuario.id) } : null);
  });

  effect(() => {
    Sentry.setTag('tenant', tenant.currentSlug() ?? undefined);
  });
}
