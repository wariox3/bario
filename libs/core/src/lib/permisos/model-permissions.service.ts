import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';
import { BaseHttpService } from '../services/base-http.service';
import { TenantService } from '../tenant/tenant.service';
import { AUTH_SERVICE } from '../tokens';
import type { ModeloId } from './modelo.catalog';
import type { ModelGrants, PermissionAction } from './permission.types';

/** Ante cualquier duda —y hoy siempre—, se permite: el backend es quien realmente niega. */
const PERMITE_TODO: ModelGrants = { ver: true, crear: true, editar: true, eliminar: true };

/**
 * Permisos del usuario sobre los modelos del backend, con cache por contenedor.
 *
 * **Hoy no consulta a nadie: permite todo.** El endpoint por modelo
 * (`GET /general/modelo/<id>/permiso/`) se retiró; ver `fetch()`. La cache, la
 * época y el reset quedan en pie para que enchufar otra fuente toque un solo
 * método.
 *
 * **Ante error de red, permite.** Esto no es seguridad, es UX: el backend
 * responde 403 igual. Un endpoint de permisos con hipo no puede dejar a nadie
 * encerrado en una app que sí funciona. Solo un `false` explícito niega.
 */
@Injectable({ providedIn: 'root' })
export class ModelPermissionsService extends BaseHttpService {
  private readonly tenant = inject(TenantService);
  private readonly auth = inject(AUTH_SERVICE);

  /**
   * Grants ya resueltos. Signal para que la directiva de botones y el menú
   * reaccionen sin suscribirse.
   */
  private readonly cache = signal<ReadonlyMap<ModeloId, ModelGrants>>(new Map());

  /** Peticiones en vuelo, para que dos consumidores del mismo modelo no dupliquen. */
  private readonly inFlight = new Map<ModeloId, Observable<ModelGrants>>();

  /**
   * Generación de la cache. `reset()` la incrementa y con eso invalida todo lo
   * que estuviera en el aire: una respuesta pedida antes del cambio ya no
   * pertenece a este contenedor ni a este usuario, así que se descarta al
   * llegar en vez de escribirse sobre lo nuevo.
   */
  private epoca = 0;

  constructor() {
    super();

    // Lo aprendido vale para **este usuario en esta empresa**. Cambia cualquiera
    // de los dos y se descarta todo.
    //
    // El usuario importa tanto como la empresa, y por un camino menos obvio: el
    // logout explícito limpia el tenant (y con eso ya reseteaba), pero una sesión
    // vencida termina en `clearSession()`, que no lo toca. Sin mirar al usuario,
    // quien entrara después en ese navegador heredaba los permisos del anterior.
    //
    // Se compara el **id**, no el objeto: `me()` puede reemplazarlo con datos
    // frescos sin que haya cambiado de persona.
    //
    // El primer disparo no resetea: el servicio nace dentro del guard de la
    // primera ruta permisada, así que su efecto corre cuando la respuesta ya
    // puede estar guardada, y borrarla obligaría a preguntar de nuevo.
    let anterior = untracked(() => this.identidad());
    effect(() => {
      const actual = this.identidad();
      if (actual === anterior) return;
      anterior = actual;
      this.reset();
    });
  }

  /** Quién está mirando y desde qué empresa. Cambiar de cualquiera invalida todo. */
  private identidad(): string {
    return `${this.auth.currentUser()?.id ?? ''}@${this.tenant.currentSlug() ?? ''}`;
  }

  /** Grants ya conocidos de un modelo, o `undefined` si nunca se preguntó. */
  grants(modelo: ModeloId): ModelGrants | undefined {
    return this.cache().get(modelo);
  }

  /**
   * ¿Puede, según lo que ya sabemos? Sin haber preguntado responde `true`: es la
   * respuesta optimista que sostiene el menú completo. Quien necesite la verdad
   * antes de decidir usa `load()`.
   */
  allows(modelo: ModeloId, accion: PermissionAction): boolean {
    return this.grants(modelo)?.[accion] ?? true;
  }

  /**
   * Resuelve los grants de un modelo: cache → petición en vuelo → HTTP.
   * Completa siempre; nunca emite error (ver la regla de permitir ante fallo).
   */
  load(modelo: ModeloId): Observable<ModelGrants> {
    const cached = this.grants(modelo);
    if (cached) return of(cached);

    const pending = this.inFlight.get(modelo);
    if (pending) return pending;

    // La época se captura al pedir, no al responder: si entre medio hubo un
    // cambio de usuario o de empresa, esta respuesta ya no es de nadie. Se le
    // sigue entregando al guard que la esperaba —cancelar su navegación sería
    // peor— pero no se guarda.
    const epoca = this.epoca;
    const request = this.fetch().pipe(
      tap((grants) => {
        if (epoca !== this.epoca) return;
        this.remember(modelo, grants);
        this.inFlight.delete(modelo);
      }),
      // El permisivo de emergencia va **después** del `tap`, no dentro de
      // `fetch()`: así responde sin quedar guardado. Recordarlo convertiría un
      // hipo de red en un "todo permitido" para el resto de la sesión, que es
      // lo contrario de lo que promete la regla — permitir ante fallo, no
      // aprender del fallo. Al no guardarse, el próximo intento vuelve a
      // preguntar.
      catchError(() => {
        this.inFlight.delete(modelo);
        return of(PERMITE_TODO);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight.set(modelo, request);
    return request;
  }

  /**
   * Descarta todo lo aprendido. Lo llama el cambio de usuario o de empresa, y
   * sirve para un cambio de rol en caliente.
   *
   * Incrementar la época es lo que hace que esto valga también para las
   * peticiones que ya salieron: vaciar los mapas no las cancela, y sin la época
   * escribirían su respuesta vieja sobre la cache nueva.
   */
  reset(): void {
    this.epoca++;
    this.cache.set(new Map());
    this.inFlight.clear();
  }

  /**
   * El **único** punto de contacto con la fuente de permisos.
   *
   * **Hoy permite todo sin preguntar.** `GET /general/modelo/<id>/permiso/` se
   * retiró del front a pedido del negocio: el usuario ve todas las rutas y
   * botones, y el backend sigue respondiendo 403 donde no le toca. El día que
   * haya otra fuente (una consulta masiva, los permisos por membresía), se
   * reemplaza esto y nada más: guards, menú y botones ya leen de `load()`.
   */
  private fetch(): Observable<ModelGrants> {
    return of(PERMITE_TODO);
  }

  private remember(modelo: ModeloId, grants: ModelGrants): void {
    const next = new Map(this.cache());
    next.set(modelo, grants);
    this.cache.set(next);
  }
}
