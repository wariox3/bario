import { Component, inject } from '@angular/core';
import type { ValidatorFn } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import { rangoFechasMismoAnio } from '../../../../shared/informe-cuentas.validators';
import type { SaldoCuentaRow } from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { SaldosCuentaTableComponent } from '../../../../shared/components/saldos-cuenta-table/saldos-cuenta-table.component';
import { BalancePruebaService } from '../../balance-prueba.service';

/**
 * Informe **Balance de prueba** del módulo Contabilidad.
 *
 * Saldos por cuenta de todo el plan en un periodo: saldo anterior, movimiento
 * del rango y saldo final. Es un **reporte que se genera**: la tabla arranca
 * vacía y el backend devuelve el resultado completo, sin paginar, porque los
 * totales tienen que cuadrar contra lo que se ve.
 *
 * Único informe de la familia que exige que **ambas fechas caigan en el mismo
 * año**: el saldo anterior se calcula contra la apertura del ejercicio, así que
 * un rango a caballo entre dos años daría un balance que no cuadra.
 */
@Component({
  selector: 'app-balance-prueba',
  standalone: true,
  imports: [
    ListShellComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    SaldosCuentaTableComponent,
  ],
  templateUrl: './balance-prueba.component.html',
  styleUrl: './balance-prueba.component.scss',
})
export class BalancePruebaComponent extends InformeCuentasPageBase<SaldoCuentaRow> {
  protected readonly service = inject(BalancePruebaService);
  protected readonly archivo = 'balance-prueba';

  protected get nombre(): string {
    return this.t().entities.balancePrueba.name;
  }

  protected override rangeValidator(): ValidatorFn {
    return rangoFechasMismoAnio('fecha_desde', 'fecha_hasta');
  }
}
