import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TenantService } from './tenant.service';

/**
 * Suelta el tenant activo al entrar al selector de contenedores.
 *
 * Estar en el selector *es* no tener contenedor elegido, pero nada limpiaba el
 * signal al volver desde `/t/:slug`: quedaba apuntando al último tenant visitado.
 * Quien lea `currentSlug()` desde esta pantalla —hoy el app-switcher, para armar
 * el enlace a la app hermana— vería un tenant que el usuario ya no está mirando.
 *
 * Solo limpia los signals; `LAST_TENANT_KEY` sigue en `localStorage`, así que
 * `rootRedirectGuard` puede seguir reanudando el último contenedor en la próxima
 * visita a la raíz.
 */
export const clearTenantGuard: CanActivateFn = () => {
  inject(TenantService).clear();
  return true;
};
