import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { PermissionsService } from './permissions.service';
import type { ModeloId } from './modelo.catalog';
import type { PermissionAction } from './permission.types';

/**
 * Renderiza su contenido solo si el usuario tiene el permiso.
 *
 * Es la capa fina, para dentro de una pantalla a la que el usuario **sí** entró:
 * el botón "Nuevo" de quien solo puede ver, la acción de borrar de una fila.
 * El acceso a la pantalla entera no se resuelve acá sino en la ruta, con
 * `withPermission` — esconder el botón no impide escribir la URL del formulario.
 *
 * ```html
 * <button *appHasPermission="MODELO.general.contacto; accion: 'crear'">Nuevo</button>
 * ```
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly permissions = inject(PermissionsService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  /** Modelo del backend que gobierna el contenido. */
  readonly appHasPermission = input.required<ModeloId>();

  /** Acción exigida. Por defecto `ver`, que es lo que pide un contenido visible. */
  readonly appHasPermissionAccion = input<PermissionAction>('ver');

  private rendered = false;

  constructor() {
    effect(() => {
      const allowed = this.permissions.can(this.appHasPermission(), this.appHasPermissionAccion());
      if (allowed === this.rendered) return;

      if (allowed) {
        this.viewContainer.createEmbeddedView(this.template);
      } else {
        this.viewContainer.clear();
      }
      this.rendered = allowed;
    });
  }
}
