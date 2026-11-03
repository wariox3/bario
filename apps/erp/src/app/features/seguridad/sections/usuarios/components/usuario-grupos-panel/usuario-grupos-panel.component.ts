import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap, type Observable } from 'rxjs';
import {
  I18nService,
  ToastService,
  type GrupoSeguridad,
  type UsuarioClienteGrupo,
} from '@reddoc/core';
import { iconoDeGrupo } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { SeguridadUsuariosService } from '../../usuarios.service';

/**
 * Nivel de acceso de la persona a un módulo. Un grupo es un módulo y su fila
 * de `usuario-cliente-grupo` lo enciende en uno de dos niveles según
 * `heredar_permisos`; sin fila no hay acceso.
 */
export type NivelAcceso = 'ninguno' | 'menu' | 'completo';

const NIVELES: readonly NivelAcceso[] = ['ninguno', 'menu', 'completo'];

/** Lo que de verdad hay guardado para un grupo: su fila y su flag. */
interface Asignacion {
  readonly id: number;
  readonly heredar: boolean;
}

function nivelDe(asignacion: Asignacion | undefined): NivelAcceso {
  if (!asignacion) return 'ninguno';
  return asignacion.heredar ? 'completo' : 'menu';
}

/**
 * Acceso del miembro módulo por módulo: el catálogo **completo** de grupos
 * (`/seguridad/grupo/`) como lista, y en cada fila un selector segmentado
 * de tres pasos — sin acceso · solo menú · completo. No es una tabla: hay una
 * sola decisión por fila y se toma de un clic, sin columnas que leer.
 *
 * El backend no tiene PUT: pasar de "solo menú" a "completo" (o al revés) es
 * borrar la fila y crear otra con el `heredar_permisos` nuevo. Se hace en
 * serie; si el alta falla después de un borrado exitoso, el módulo queda sin
 * acceso y así se muestra (es lo que quedó guardado).
 *
 * El cambio es **optimista**: el segmento salta al instante, la fila se
 * bloquea mientras vuela y se revierte a lo guardado si falla (el toast de
 * error lo pone el `errorInterceptor` global).
 */
@Component({
  selector: 'app-usuario-grupos-panel',
  standalone: true,
  templateUrl: './usuario-grupos-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioGruposPanelComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly niveles = NIVELES;
  protected readonly iconoDeGrupo = iconoDeGrupo;

  /** `id` de la membresía (`usuario_cliente` del `POST`). */
  readonly usuarioClienteId = input.required<number>();

  /** Filas de `usuario-cliente-grupo` de la membresía. */
  readonly asignados = input<readonly UsuarioClienteGrupo[]>([]);

  protected readonly catalogo = signal<readonly GrupoSeguridad[]>([]);
  protected readonly isLoadingCatalogo = signal(true);

  /** Grupos con petición en vuelo: su fila se bloquea hasta que responda. */
  protected readonly pendientes = signal<readonly number[]>([]);

  /** Lo guardado, por grupo. Nace del input y se actualiza con cada respuesta. */
  private readonly guardado = linkedSignal<ReadonlyMap<number, Asignacion>>(
    () =>
      new Map(
        this.asignados().map((a) => [a.grupo, { id: a.id, heredar: a.heredar_permisos === true }]),
      ),
  );

  /** Lo que se pinta: lo guardado más los cambios optimistas en vuelo. */
  private readonly optimista = signal<ReadonlyMap<number, NivelAcceso>>(new Map());

  /** Catálogo completo + asignados que no estén en él (no perder membresías). */
  protected readonly items = computed<readonly GrupoSeguridad[]>(() => {
    const catalogo = this.catalogo();
    const extras = this.asignados()
      .filter((a) => !catalogo.some((c) => c.id === a.grupo))
      .map((a) => ({ id: a.grupo, nombre: a.grupo_name ?? '' }));
    return [...catalogo, ...extras];
  });

  protected readonly countLabel = computed(() => {
    const dict = this.t().seguridad.usuarios.detalle.grupos;
    const niveles = this.items().map((g) => this.nivel(g.id));
    const conAcceso = niveles.filter((n) => n !== 'ninguno').length;
    const completos = niveles.filter((n) => n === 'completo').length;
    if (conAcceso === 0) return dict.count.zero;
    const total = String(this.items().length);
    const base = (conAcceso === 1 ? dict.count.one : dict.count.other)
      .replace('{n}', String(conAcceso))
      .replace('{total}', total);
    return completos > 0 ? `${base} · ${dict.completos.replace('{n}', String(completos))}` : base;
  });

  constructor() {
    this.service
      .getGrupos()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (grupos) => {
          this.catalogo.set(grupos);
          this.isLoadingCatalogo.set(false);
        },
        error: () => {
          this.catalogo.set([]);
          this.isLoadingCatalogo.set(false);
        },
      });
  }

  protected nivel(grupoId: number): NivelAcceso {
    return this.optimista().get(grupoId) ?? nivelDe(this.guardado().get(grupoId));
  }

  protected estaPendiente(grupoId: number): boolean {
    return this.pendientes().includes(grupoId);
  }

  protected cambiar(grupo: GrupoSeguridad, destino: NivelAcceso): void {
    if (this.estaPendiente(grupo.id) || this.nivel(grupo.id) === destino) return;
    const actual = this.guardado().get(grupo.id);

    this.setOptimista(grupo.id, destino);
    this.pendientes.update((ids) => [...ids, grupo.id]);

    this.transicion(grupo.id, actual, destino)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nueva) => {
          this.setGuardado(grupo.id, nueva);
          this.terminar(grupo.id);
          const dict = this.t().seguridad.usuarios.detalle.grupos;
          this.toast.success(
            dict.toasts.changed.title,
            dict.toasts.changed.desc
              .replace('{grupo}', grupo.nombre)
              .replace('{nivel}', dict.niveles[destino]),
          );
        },
        error: () => this.terminar(grupo.id),
      });
  }

  /**
   * De lo guardado al nivel destino. Devuelve la asignación resultante
   * (`undefined` = sin acceso). Cambiar de nivel teniendo fila es borrar y
   * crear: si el borrado entró y el alta no, se anota la baja antes de
   * propagar el error, para no mostrar un acceso que ya no existe.
   */
  private transicion(
    grupoId: number,
    actual: Asignacion | undefined,
    destino: NivelAcceso,
  ): Observable<Asignacion | undefined> {
    const borrar$: Observable<void> = actual
      ? this.service.removeGrupo(actual.id).pipe(
          map(() => {
            this.setGuardado(grupoId, undefined);
          }),
        )
      : of(undefined);

    if (destino === 'ninguno') return borrar$.pipe(map(() => undefined));

    const heredar = destino === 'completo';
    return borrar$.pipe(
      switchMap(() => this.service.addGrupo(this.usuarioClienteId(), grupoId, heredar)),
      map((fila) => ({ id: fila.id, heredar: fila.heredar_permisos ?? heredar })),
    );
  }

  private terminar(grupoId: number): void {
    this.pendientes.update((ids) => ids.filter((id) => id !== grupoId));
    this.setOptimista(grupoId, undefined);
  }

  private setOptimista(grupoId: number, nivel: NivelAcceso | undefined): void {
    this.optimista.update((actual) => {
      const siguiente = new Map(actual);
      if (nivel === undefined) siguiente.delete(grupoId);
      else siguiente.set(grupoId, nivel);
      return siguiente;
    });
  }

  private setGuardado(grupoId: number, asignacion: Asignacion | undefined): void {
    this.guardado.update((actual) => {
      const siguiente = new Map(actual);
      if (asignacion === undefined) siguiente.delete(grupoId);
      else siguiente.set(grupoId, asignacion);
      return siguiente;
    });
  }

  /**
   * Segmento del selector: misma caja en todos los estados, solo cambia la
   * tinta. El idioma de la ficha navy: tenue = tiene algo, sólido = lleno;
   * "sin acceso" activo es neutro, no navy — no hay nada que afirmar.
   */
  protected segmentoClass(nivel: NivelAcceso, activo: boolean): string {
    const base =
      'cursor-pointer rounded-md px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[rgba(20,48,73,0.4)] disabled:cursor-wait ';
    if (!activo)
      return base + 'text-brand-muted hover:bg-[rgba(20,48,73,0.04)] hover:text-brand-text';
    if (nivel === 'completo') return base + 'bg-brand-navy text-white';
    if (nivel === 'menu') return base + 'bg-[rgba(20,48,73,0.1)] text-brand-navy';
    return base + 'bg-[rgba(19,38,60,0.06)] text-brand-text';
  }
}
