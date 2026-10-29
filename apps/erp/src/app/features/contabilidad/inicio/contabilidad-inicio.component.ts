import { Component } from '@angular/core';
import { EstadoResultadosTableroComponent } from './estado-resultados-tablero/estado-resultados-tablero.component';
import { PendienteContabilizarAlertaComponent } from './pendiente-contabilizar-alerta/pendiente-contabilizar-alerta.component';

/**
 * Inicio del módulo Contabilidad: el estado de resultados en cascada, a todo el
 * ancho de la grilla, con el aviso de pendientes por contabilizar encima cuando
 * los hay. Es el landing del módulo; lo que venga se apila debajo.
 */
@Component({
  selector: 'app-contabilidad-inicio',
  standalone: true,
  imports: [PendienteContabilizarAlertaComponent, EstadoResultadosTableroComponent],
  // Grilla de cuatro columnas, como los demás inicios: el aviso y la cascada ocupan las cuatro.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-pendiente-contabilizar-alerta />
      <app-estado-resultados-tablero />
    </div>
  `,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class ContabilidadInicioComponent {}
