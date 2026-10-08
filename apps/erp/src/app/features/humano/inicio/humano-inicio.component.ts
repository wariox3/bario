import { Component } from '@angular/core';
import { AsistenteInvitacionComponent } from '@erp/features/asistente-electronico/components/asistente-invitacion/asistente-invitacion.component';

/**
 * Inicio del módulo Humano.
 *
 * Como el de Venta: hoy solo la invitación a la nómina electrónica, compuesta
 * como una tira arriba para que lo que venga después (indicadores, accesos
 * rápidos) se apile debajo sin rehacerla.
 */
@Component({
  selector: 'app-humano-inicio',
  standalone: true,
  imports: [AsistenteInvitacionComponent],
  template: `<app-asistente-invitacion variante="nomina" />`,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class HumanoInicioComponent {}
