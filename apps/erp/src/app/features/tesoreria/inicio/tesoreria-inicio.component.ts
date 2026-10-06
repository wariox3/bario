import { Component } from '@angular/core';
import { CarteraResumenComponent } from '@erp/features/documentos/cartera-resumen/cartera-resumen.component';

/**
 * Inicio del módulo Tesorería: la ficha de saldo de las cuentas por pagar. Es el
 * landing del módulo, así que puede crecer; lo que venga se apila en la grilla.
 */
@Component({
  selector: 'app-tesoreria-inicio',
  standalone: true,
  imports: [CarteraResumenComponent],
  // Grilla de cuatro columnas: la ficha ocupa una y deja lugar a lo que se sume.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-cartera-resumen tipo="pagar" />
    </div>
  `,
  // Mismo ancho acotado que los demás inicios: no es una tabla, se lee en columna.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class TesoreriaInicioComponent {}
