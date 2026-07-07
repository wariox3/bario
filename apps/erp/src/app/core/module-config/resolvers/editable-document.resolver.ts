import { inject } from '@angular/core';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';
import { type Observable, catchError, map, of } from 'rxjs';
import {
  type EditableRowContext,
  ENTITY_DATA_GATEWAY,
  I18nService,
  TenantService,
  ToastService,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { MissingModuleContextError } from '../errors/config.errors';
import { ModuleNavigationStore } from '../module-navigation.store';

/**
 * Puerta de la ruta de edición (`editar/:id`) que cumple dos roles a la vez:
 *
 *  1. **Bloqueo:** si la política `canEditRow` del documento declara la fila no
 *     editable (p. ej. ya aprobada), avisa con un toast y redirige al detalle.
 *  2. **Pre-fetch:** si es editable, devuelve la cabecera ya cargada para que el
 *     form la reúse — así no se vuelve a pedir el documento (un solo `getById`).
 *     El valor resuelto se inyecta al form como input `documentoEdit` vía
 *     `withComponentInputBinding`.
 *
 * Es un **resolver**, no un `CanActivateFn`, a propósito. En carga directa por
 * URL el árbol se activa en frío y los guards `canActivate` corren ANTES que los
 * resolvers (pasos 3 y 4 del pipeline del router): en ese momento el
 * `activeDocumentResolver` del padre todavía no dejó el documento en
 * `ModuleNavigationStore`, así que un guard vería `activeDocument()` vacío. Un
 * resolver corre después del padre, garantizando el documento activo — mismo
 * patrón que el resto del framework.
 *
 * Consulta la MISMA política declarativa que la lista (`visibleFor`) y el
 * detalle (`[disabled]`): `DocumentEntityConfig.canEditRow`. Si no hay predicado
 * declarado deja pasar entregando igual la cabecera. Si el fetch falla devuelve
 * `null` (fail-open): el form cargará por su cuenta y el backend sigue siendo la
 * autoridad final sobre la edición.
 */
export function editableDocumentResolver(): ResolveFn<unknown | RedirectCommand> {
  return (route): Observable<unknown | RedirectCommand> => {
    const navigation = inject(ModuleNavigationStore);
    const gateway = inject(ENTITY_DATA_GATEWAY);
    const router = inject(Router);
    const tenant = inject(TenantService);
    const toast = inject(ToastService);
    const i18n = inject<I18nService<AppDict>>(I18nService);

    const document = navigation.activeDocument();
    const activeModule = navigation.activeModule();
    if (!document || !activeModule) throw new MissingModuleContextError();

    const id = route.paramMap.get('id');
    if (!id) return of(null);

    const canEditRow = document.canEditRow;

    return gateway.getById(document, id).pipe(
      map((read) => {
        // Editable (o sin política declarada): entrega la cabecera para reusarla.
        if (!canEditRow || canEditRow(read as EditableRowContext)) return read;

        // No editable: avisa y redirige al detalle; el form nunca se monta.
        const ts = i18n.t().documentActions.detail.toasts.editBloqueado;
        toast.warn(ts.title, ts.desc);

        const detailCommands = [
          '/t',
          tenant.currentSlug(),
          activeModule.id,
          ...document.routes.detail.split('/').filter(Boolean),
          id,
        ];
        return new RedirectCommand(router.createUrlTree(detailCommands));
      }),
      // Si no se pudo cargar, no bloqueamos: el form hará su propia carga (que
      // mostrará su error si corresponde) y el backend rechaza el guardado.
      catchError(() => of(null)),
    );
  };
}
