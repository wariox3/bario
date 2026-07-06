import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { Contenedor, ContenedorService, getInitials, TenantService } from '@reddoc/core';

/**
 * Selección de contenedor de Turnos.
 *
 * Lista los contenedores accesibles (`ContenedorService.getAccesos()`). Al
 * elegir uno, fija el tenant activo (`TenantService.setCurrent`) y navega a su
 * inicio (`/t/<schema_name>/inicio`). Versión mínima: sin crear/invitar/borrar.
 */
@Component({
  selector: 'app-contenedores-seleccion',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './contenedores-seleccion.component.html',
})
export class ContenedoresSeleccionComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);

  private readonly response = toSignal(this.contenedorService.getAccesos());

  protected readonly isLoading = computed(() => this.response() === undefined);

  protected readonly contenedores = computed(() => this.response()?.results ?? []);

  protected readonly isEmpty = computed(
    () => !this.isLoading() && this.contenedores().length === 0,
  );

  protected readonly skeletonItems = Array.from({ length: 3 });

  protected initials(nombre: string): string {
    return getInitials(nombre);
  }

  protected enter(contenedor: Contenedor): void {
    this.tenant.setCurrent(contenedor);
    this.router.navigate(['/t', contenedor.schema_name, 'inicio']);
  }
}
