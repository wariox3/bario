import { Injectable, computed, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { TenantService } from '@reddoc/core';
import { ERP_MODULES } from '@erp/core/erp-modules';
import { ROL_ADMIN_IDS } from './contenedor-rol.constants';
import type { ModeloId } from './modelo.catalog';
import { ModelPermissionsService } from './model-permissions.service';
import { readModuleAccessFlags } from './module-access';
import type { PermissionAction } from './permission.types';

/**
 * ¿Conocemos los permisos de **todos** los modelos antes de pintar?
 *
 * Hoy no: se piden de a uno al entrar a cada feature. Pasa a `true` cuando el
 * backend exponga la consulta masiva, y con eso el menú empieza a podarse.
 */
const GRANTS_COMPLETOS = false;

/**
 * Decide qué puede ver y hacer el usuario en el tenant activo.
 *
 * Responde tres preguntas ortogonales, que conviene no mezclar:
 *
 *  1. **¿Qué compró el tenant?** — `enabledModuleIds` / `canAccessModule`.
 *     Depende del plan del contenedor, no de quién sos.
 *  2. **¿Qué puede hacer este usuario?** — `can` / `canResolve`, sobre los
 *     modelos del backend (`ModelPermissionsService`).
 *  3. **¿Administra el contenedor?** — `isContenedorAdmin`, del `rol_id`.
 *     Gobierna la pantalla de Seguridad, no el trabajo operativo.
 *
 * Nada de esto es seguridad: es UX. El backend sigue siendo el que responde
 * 403. Acá solo evitamos ofrecer puertas que van a rebotar.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly tenant = inject(TenantService);
  private readonly modelPermissions = inject(ModelPermissionsService);

  /**
   * Módulos habilitados por el plan del contenedor activo.
   *
   * El backend manda las flags `acceso_*` en `/contenedor/cliente/lista-usuario/`
   * y cada descriptor declara cuál le corresponde. Un módulo sin `accessFlag`
   * (General) está siempre disponible: es la base, no se contrata aparte.
   *
   * Si el contenedor no trae ninguna flag, no se restringe nada — ver
   * `readModuleAccessFlags`.
   */
  readonly enabledModuleIds = computed<ReadonlySet<string>>(() => {
    const granted = readModuleAccessFlags(this.tenant.currentContenedor());
    if (granted === null) return new Set(ERP_MODULES.map((m) => m.id));

    return new Set(
      ERP_MODULES.filter((m) => m.accessFlag === undefined || granted.has(m.accessFlag)).map(
        (m) => m.id,
      ),
    );
  });

  canAccessModule(id: string): boolean {
    return this.enabledModuleIds().has(id);
  }

  /**
   * ¿Puede el usuario, según lo que **ya sabemos**?
   *
   * Lectura sincrónica de la cache: la usan el menú y los botones, que no pueden
   * esperar una petición. Dos casos dicen que sí sin preguntar, y los dos son
   * deliberados:
   *
   *  - **Sin modelo** (`undefined`) — la entrada, la ruta o la pantalla no
   *    declara modelo: es abierta dentro del tenant. Es lo que permite adoptar
   *    esta capa recurso por recurso, y lo que deja pasar a los documentos
   *    mientras el backend no los distinga.
   *  - **Modelo sin consultar** — todavía no se entró a ese feature; la verdad
   *    llega al entrar (ver `permissionGuard`).
   *
   * Para los **botones** eso alcanza: cuando la pantalla monta, el guard ya dejó
   * la respuesta en cache. El **menú** no puede usar esto —preguntaría por
   * features en los que nunca se entró— y por eso tiene su propio
   * `canShowInMenu`.
   */
  can(modelo: ModeloId | undefined, accion: PermissionAction = 'ver'): boolean {
    if (modelo === undefined) return true;
    return this.modelPermissions.allows(modelo, accion);
  }

  /**
   * ¿Se ofrece esta entrada en el menú?
   *
   * **Hoy siempre sí**, y es deliberado: los grants llegan al entrar al feature,
   * así que podar con lo que sabemos daría un menú que cambia bajo los pies —
   * hacés clic en "Contactos", te rebota al acceso denegado y la entrada que
   * acabás de tocar desaparece. Un menú estable que a veces rebota se entiende;
   * uno que se reordena solo, no.
   *
   * Podar exige saberlo **todo antes de pintar**, o sea el endpoint masivo. El
   * día que exista, esto pasa a delegar en `can` y el menú empieza a filtrar sin
   * tocar ni un descriptor.
   */
  canShowInMenu(modelo: ModeloId | undefined): boolean {
    if (modelo === undefined) return true;
    // Sin la foto completa antes de pintar, no se poda nada. Escrito con
    // early-returns y no como una expresión con `||` y ternario: ahí la
    // precedencia agrupa `(modelo === undefined || GRANTS_COMPLETOS)` y el menú
    // termina podándose con lo que se acaba de aprender — justo el bug que este
    // método existe para evitar.
    if (!GRANTS_COMPLETOS) return true;
    return this.can(modelo);
  }

  /**
   * La verdad, aunque haya que ir a buscarla. La usa el guard de ruta: entrar a
   * un feature es el momento en que se paga la petición, y una vez pagada queda
   * en cache para los botones de la pantalla.
   */
  canResolve(modelo: ModeloId | undefined, accion: PermissionAction = 'ver'): Observable<boolean> {
    if (modelo === undefined) return of(true);
    return this.modelPermissions.load(modelo).pipe(map((grants) => grants[accion]));
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
