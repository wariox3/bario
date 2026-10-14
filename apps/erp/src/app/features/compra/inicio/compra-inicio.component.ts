import { Component } from '@angular/core';
import { ComercialResumenComponent } from '@erp/features/documentos/comercial-resumen/comercial-resumen.component';

/**
 * Inicio del módulo Compra: la gráfica de compras del período. Es el landing
 * del módulo, así que puede crecer; lo que venga entra en la grilla.
 */
@Component({
  selector: 'app-compra-inicio',
  standalone: true,
  imports: [ComercialResumenComponent],
  // Grilla de cuatro columnas, la misma de los demás inicios: la gráfica ocupa
  // la fila entera.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-comercial-resumen tipo="compra" />
    </div>
  `,
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col gap-4' },
})
export class CompraInicioComponent {}
