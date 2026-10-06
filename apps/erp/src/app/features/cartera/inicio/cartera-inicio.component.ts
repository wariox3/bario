import { Component } from '@angular/core';
import { CarteraResumenComponent } from '@erp/features/documentos/cartera-resumen/cartera-resumen.component';

/**
 * Inicio del módulo Cartera: la ficha de saldo de las cuentas por cobrar. Es el
 * landing del módulo, así que puede crecer; lo que venga se apila debajo.
 */
@Component({
  selector: 'app-cartera-inicio',
  standalone: true,
  imports: [CarteraResumenComponent],
  // Grilla de cuatro columnas: la ficha ocupa una y deja lugar a lo que se sume.
  template: `
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <app-cartera-resumen tipo="cobrar" />
    </div>
  `,
  // Mismo ancho acotado que el inicio de Venta: no es una tabla, se lee en columna.
  host: { class: 'mx-auto flex w-full max-w-[1200px] flex-col' },
})
export class CarteraInicioComponent {}
