import { Component } from '@angular/core';
import { EstadoResultadosTableroComponent } from './estado-resultados-tablero/estado-resultados-tablero.component';
import { InconsistenciasPeriodoComponent } from './inconsistencias-periodo/inconsistencias-periodo.component';
import { PendienteContabilizarAlertaComponent } from './pendiente-contabilizar-alerta/pendiente-contabilizar-alerta.component';

/**
 * Inicio del módulo Contabilidad: el estado de resultados en cascada, a todo el
 * ancho de la grilla, con el aviso de pendientes por contabilizar encima cuando
 * los hay y las inconsistencias del periodo debajo, también solo si las hay.
 * Es el landing del módulo; lo que venga se apila debajo.
 */
@Component({
  selector: 'app-contabilidad-inicio',
  standalone: true,
  imports: [
    PendienteContabilizarAlertaComponent,
    EstadoResultadosTableroComponent,
    InconsistenciasPeriodoComponent,
  ],
  // Grilla de cuatro columnas, como los demás inicios: el aviso, la cascada y las inconsistencias ocupan las cuatro.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-pendiente-contabilizar-alerta />
      <app-estado-resultados-tablero />
      <app-inconsistencias-periodo />
    </div>
  `,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class ContabilidadInicioComponent {}
