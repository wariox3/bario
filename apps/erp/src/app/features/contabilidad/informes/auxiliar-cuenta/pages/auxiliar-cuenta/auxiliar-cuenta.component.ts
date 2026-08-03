import { Component, inject } from '@angular/core';
import { ListShellComponent } from '@reddoc/feature-base';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import type { SaldoCuentaRow } from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { SaldosCuentaTableComponent } from '../../../../shared/components/saldos-cuenta-table/saldos-cuenta-table.component';
import { AuxiliarCuentaService } from '../../auxiliar-cuenta.service';

/**
 * Informe **Auxiliar de cuenta** del módulo Contabilidad.
 *
 * Mismos parámetros y misma tabla que el balance de prueba; cambia el endpoint.
 * A diferencia de aquel, **no** exige que las dos fechas caigan en el mismo año
 * (el informe original solo validaba el orden), así que hereda el validador de
 * rango por defecto de la base.
 *
 * ⚠️ **Ojo con el alcance funcional.** El informe original de esta pantalla
 * devuelve y pinta exactamente las mismas columnas de saldos que el balance de
 * prueba, cuando lo que uno esperaría de un "auxiliar" es el **detalle de
 * movimientos** de cada cuenta (comprobante, número, fecha, detalle, débito,
 * crédito, saldo corrido). Todo apunta a que allá quedó a medio hacer: su
 * formulario declara controles `comprobante`, `cuenta` y `contacto` que la
 * plantilla nunca renderiza, y su botón de PDF manda un cuerpo distinto al de
 * Excel. Se portó lo que **hace**, no lo que promete el nombre; si el auxiliar
 * debe mostrar movimientos, es un cambio de alcance a definir con el backend.
 */
@Component({
  selector: 'app-auxiliar-cuenta',
  standalone: true,
  imports: [
    ListShellComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    SaldosCuentaTableComponent,
  ],
  templateUrl: './auxiliar-cuenta.component.html',
  styleUrl: './auxiliar-cuenta.component.scss',
})
export class AuxiliarCuentaComponent extends InformeCuentasPageBase<SaldoCuentaRow> {
  protected readonly service = inject(AuxiliarCuentaService);
  protected readonly archivo = 'auxiliar-cuenta';

  protected get nombre(): string {
    return this.t().entities.auxiliarCuenta.name;
  }
}
