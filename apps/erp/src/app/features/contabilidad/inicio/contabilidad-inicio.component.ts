import { Component } from '@angular/core';
import { EstadoResultadosTableroComponent } from './estado-resultados-tablero/estado-resultados-tablero.component';

/**
 * Inicio del módulo Contabilidad: el estado de resultados en cascada, a todo el
 * ancho de la grilla. Es el landing del módulo; lo que venga se apila debajo.
 */
@Component({
  selector: 'app-contabilidad-inicio',
  standalone: true,
  imports: [EstadoResultadosTableroComponent],
  // Grilla de cuatro columnas, como los demás inicios: la cascada ocupa las cuatro.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-estado-resultados-tablero />
    </div>
  `,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class ContabilidadInicioComponent {}
