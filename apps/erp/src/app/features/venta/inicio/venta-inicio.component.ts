import { Component } from '@angular/core';
import { AsistenteInvitacionComponent } from '@erp/features/asistente-electronico/components/asistente-invitacion/asistente-invitacion.component';
import { VentaResumenComponent } from '@erp/features/documentos/venta-resumen/venta-resumen.component';

/**
 * Inicio del módulo Venta: la invitación a facturar electrónicamente como tira
 * arriba y, debajo, la grilla del inicio con la gráfica de ventas (la misma del
 * inicio de General). Lo que se sume entra en la grilla.
 */
@Component({
  selector: 'app-venta-inicio',
  standalone: true,
  imports: [AsistenteInvitacionComponent, VentaResumenComponent],
  template: `
    <!-- empty:hidden: sin invitación, la grilla no hereda el hueco del gap -->
    <app-asistente-invitacion class="empty:hidden" variante="venta" />
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-venta-resumen />
    </div>
  `,
  // Mismo ancho acotado que Configuración: no es una tabla, se lee mejor en una
  // columna. Las listas del ERP sí van a todo el ancho.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col gap-4' },
})
export class VentaInicioComponent {}
