import { Component } from '@angular/core';
import { AsistenteInvitacionComponent } from '@erp/features/asistente-electronico/components/asistente-invitacion/asistente-invitacion.component';
import { ContratoResumenComponent } from './contrato-resumen/contrato-resumen.component';

/**
 * Inicio del módulo Humano: la invitación a la nómina electrónica como tira
 * arriba y, debajo, la grilla de fichas (hoy la de contratos), igual que los
 * inicios de Cartera y Tesorería.
 */
@Component({
  selector: 'app-humano-inicio',
  standalone: true,
  imports: [AsistenteInvitacionComponent, ContratoResumenComponent],
  // Grilla de cuatro columnas: la ficha ocupa una y deja lugar a lo que se sume.
  template: `
    <!-- empty:hidden: sin invitación, la grilla no hereda el hueco del gap -->
    <app-asistente-invitacion class="empty:hidden" variante="nomina" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-contrato-resumen />
    </div>
  `,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col gap-4' },
})
export class HumanoInicioComponent {}
