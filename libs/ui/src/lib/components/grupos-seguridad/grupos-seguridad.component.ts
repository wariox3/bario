import { Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { I18nService, type GrupoSeguridad } from '@reddoc/core';
import type { GruposSeguridadTranslationsHost } from './i18n';
import { iconoDeGrupo } from './icono-de-grupo';

/**
 * Grilla de grupos de seguridad con los que entra alguien a un contenedor.
 *
 * Es el bloque compartido entre las dos pantallas que invitan: la de usuarios
 * del contenedor activo (ERP · seguridad) y la de la lista de empresas
 * (`@reddoc/feature-contenedores`). Es tonto: el host carga el catálogo y arma
 * el payload (`grupo_ids`) con lo que quede marcado.
 */
@Component({
  selector: 'lib-grupos-seguridad',
  standalone: true,
  imports: [FormsModule, CheckboxModule],
  templateUrl: './grupos-seguridad.component.html',
})
export class GruposSeguridadComponent {
  private readonly i18n = inject<I18nService<GruposSeguridadTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Catálogo de grupos (verticales del schema público). */
  readonly grupos = input<readonly GrupoSeguridad[]>([]);
  readonly loading = input(false);

  /** Ids marcados. Arranca vacío en los dos hosts: se asigna lo que se marque. */
  readonly selected = model<readonly number[]>([]);

  /** Prefijo de los `id` del DOM, por si conviven dos grillas en una pantalla. */
  readonly inputIdPrefix = input('grupos-seguridad');

  protected readonly todos = computed(
    () => this.grupos().length > 0 && this.selected().length === this.grupos().length,
  );

  protected readonly iconoDeGrupo = iconoDeGrupo;

  protected isSelected(id: number): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: number): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id],
    );
  }

  /** Atajo del encabezado: marca todos los grupos o los desmarca todos. */
  protected toggleTodos(): void {
    this.selected.set(this.todos() ? [] : this.grupos().map((grupo) => grupo.id));
  }
}
