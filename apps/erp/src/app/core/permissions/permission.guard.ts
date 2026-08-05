import { inject } from '@angular/core';
import type { CanMatchFn, Route } from '@angular/router';
import type { Observable } from 'rxjs';
import type { ModeloId } from './modelo.catalog';
import { PermissionsService } from './permissions.service';

/** Clave bajo la que `withPermission` deja el modelo en el `data` de la ruta. */
export const PERMISSION_ROUTE_DATA_KEY = 'modelo';

/**
 * Bloquea una ruta cuyo modelo el usuario no puede **ver**.
 *
 * **Acá se paga la petición.** Entrar al feature es el momento de preguntarle al
 * backend qué se puede hacer con su modelo, y la respuesta queda en cache: para
 * cuando la pantalla monta, sus botones ya saben si dibujarse. No aparecen para
 * desaparecer un instante después.
 *
 * Es `CanMatch` y no `CanActivate` a propósito: al no hacer match, el chunk lazy
 * del master **ni se descarga**. Con `canActivate` el navegador se baja el bundle
 * entero para después no mostrarlo.
 *
 * Rechazar acá no cancela la navegación: el router sigue buscando y encuentra la
 * ruta gemela que `withPermission` dejó justo detrás con el mismo path. Este
 * guard no redirige por su cuenta — quién ve el rechazo lo decide el helper.
 *
 * Una ruta sin modelo pasa siempre; el guard nunca se pone a mano, siempre lo
 * pone `withPermission`.
 */
export const permissionGuard: CanMatchFn = (route: Route): Observable<boolean> => {
  const modelo = route.data?.[PERMISSION_ROUTE_DATA_KEY] as ModeloId | undefined;
  return inject(PermissionsService).canResolve(modelo);
};
