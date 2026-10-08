import { Component } from '@angular/core';
import { AsistenteInvitacionComponent } from '@erp/features/asistente-electronico/components/asistente-invitacion/asistente-invitacion.component';

/**
 * Inicio del módulo Venta.
 *
 * Hoy solo hospeda la invitación a facturar electrónicamente. Es el landing del
 * módulo, así que va a crecer (indicadores, accesos rápidos): la invitación se
 * compone como una tira arriba, no como el contenido de la página, para que lo
 * que venga después se apile debajo sin rehacerla.
 */
@Component({
  selector: 'app-venta-inicio',
  standalone: true,
  imports: [AsistenteInvitacionComponent],
  template: `<app-asistente-invitacion variante="venta" />`,
  // Mismo ancho acotado que Configuración: no es una tabla, se lee mejor en una
  // columna. Las listas del ERP sí van a todo el ancho.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class VentaInicioComponent {}
