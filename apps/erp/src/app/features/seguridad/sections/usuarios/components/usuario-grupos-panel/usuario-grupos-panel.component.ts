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
import { I18nService, type GrupoSeguridad } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { SeguridadUsuariosService } from '../../usuarios.service';

/**
 * Grupos del miembro como imagen de pertenencia: se pinta el catálogo
 * **completo** de verticales (`/seguridad/grupo/`) y cada ficha está encendida
 * (navy = pertenece, según `permiso.grupos`) o apagada (tenue = no). Gestionar
 * es tocar la ficha — mismo idioma que la tira calendario del sistema (mostrar
 * el set entero, "ficha = tiene valor"), sin picker ni flujo aparte.
 *
 * El toggle es **optimista**: la ficha responde al instante y pega a
 * `agregar-grupo/` / `quitar-grupo/`; si el backend falla, se revierte (el
 * toast de error lo pone el `errorInterceptor` global). Mientras la petición
 * vuela, la ficha queda deshabilitada para no encolar dobles clics.
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
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** `usuario_id` del miembro (el que espera `agregar-grupo/`). */
  readonly usuarioId = input.required<number>();

  /** Grupos a los que ya pertenece el miembro (de `permiso.grupos`). */
  readonly asignados = input<readonly GrupoSeguridad[]>([]);

  protected readonly catalogo = signal<readonly GrupoSeguridad[]>([]);
  protected readonly isLoadingCatalogo = signal(true);

  /** Ids con petición en vuelo: la ficha se bloquea hasta que responda. */
  protected readonly pendientes = signal<readonly number[]>([]);

  /** Membresía editable: nace de lo asignado y se re-sincroniza si cambia. */
  protected readonly asignadosIds = linkedSignal<readonly number[]>(() =>
    this.asignados().map((g) => g.id),
  );

  /** Catálogo completo + asignados que no estén en él (no perder membresías). */
  protected readonly items = computed<readonly GrupoSeguridad[]>(() => {
    const catalogo = this.catalogo();
    const extras = this.asignados().filter((a) => !catalogo.some((c) => c.id === a.id));
    return [...catalogo, ...extras];
  });

  protected readonly countLabel = computed(() => {
    const dict = this.t().seguridad.usuarios.detalle.grupos.count;
    const n = this.asignadosIds().length;
    const total = String(this.items().length);
    if (n === 0) return dict.zero;
    const base = n === 1 ? dict.one : dict.other.replace('{n}', String(n));
    return base.replace('{total}', total);
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

  protected esMiembro(id: number): boolean {
    return this.asignadosIds().includes(id);
  }

  protected estaPendiente(id: number): boolean {
    return this.pendientes().includes(id);
  }

  protected toggle(id: number): void {
    if (this.estaPendiente(id)) return;
    const usuarioId = this.usuarioId();
    const eraMiembro = this.esMiembro(id);

    // Optimista: la ficha cambia ya; si el backend falla, se revierte abajo.
    this.asignadosIds.update((ids) => (eraMiembro ? ids.filter((i) => i !== id) : [...ids, id]));
    this.pendientes.update((ids) => [...ids, id]);

    const request = eraMiembro
      ? this.service.removeGrupo(usuarioId, id)
      : this.service.addGrupo(usuarioId, id);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.pendientes.update((ids) => ids.filter((i) => i !== id)),
      error: () => {
        this.pendientes.update((ids) => ids.filter((i) => i !== id));
        this.asignadosIds.update((ids) =>
          eraMiembro ? [...ids, id] : ids.filter((i) => i !== id),
        );
      },
    });
  }
}
