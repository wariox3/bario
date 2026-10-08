import { Component, computed, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import {
  I18nService,
  accesosDisponibles,
  type ContenedorAcceso,
  type ContenedorAccesoFlags,
  type ContenedorAccesoId,
} from '@reddoc/core';
import type { AccesosContenedorTranslationsHost } from './i18n';

/**
 * Grilla de accesos por módulo que se le otorgan a alguien en un contenedor.
 *
 * Es el bloque compartido entre las dos pantallas que invitan: la de usuarios
 * del contenedor activo (ERP · seguridad) y la de la lista de empresas
 * (`@reddoc/feature-contenedores`). Solo maneja la selección: quién arma el
 * payload y lo manda es el formulario que lo hospeda, con `buildAccesoFlags`.
 *
 * Los accesos ofrecidos se recortan al plan del contenedor recibido: no se
 * puede invitar a alguien a un módulo que la empresa no contrató. Sin ninguno
 * disponible no pinta nada.
 */
@Component({
  selector: 'lib-accesos-contenedor',
  standalone: true,
  imports: [FormsModule, CheckboxModule],
  templateUrl: './accesos-contenedor.component.html',
})
export class AccesosContenedorComponent {
  private readonly i18n = inject<I18nService<AccesosContenedorTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  /** El contenedor al que se invita: de él sale el plan que recorta el catálogo. */
  readonly contenedor = input<ContenedorAccesoFlags | null>(null);

  /**
   * Accesos marcados. Arranca vacío en los dos hosts: se otorga lo que se
   * marque, nada más.
   */
  readonly selected = model<readonly ContenedorAccesoId[]>([]);

  /** Prefijo de los `id` del DOM, por si conviven dos grillas en una pantalla. */
  readonly inputIdPrefix = input('accesos-contenedor');

  protected readonly disponibles = computed<readonly ContenedorAcceso[]>(() =>
    accesosDisponibles(this.contenedor()),
  );

  protected readonly todos = computed(
    () => this.disponibles().length > 0 && this.selected().length === this.disponibles().length,
  );

  protected isSelected(id: ContenedorAccesoId): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: ContenedorAccesoId): void {
    this.selected.update((ids) =>
      ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id],
    );
  }

  /** Atajo del encabezado: marca todos los disponibles o los desmarca todos. */
  protected toggleTodos(): void {
    this.selected.set(this.todos() ? [] : this.disponibles().map((acceso) => acceso.id));
  }
}
