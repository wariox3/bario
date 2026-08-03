import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import { rangoFechasMismoAnio } from '../../../../shared/informe-cuentas.validators';
import type {
  InformeCuentasContactoParams,
  SaldoCuentaContactoRow,
} from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { SaldosCuentaTableComponent } from '../../../../shared/components/saldos-cuenta-table/saldos-cuenta-table.component';
import { BalancePruebaContactoService } from '../../balance-prueba-contacto.service';

/**
 * Informe **Balance de prueba por contacto** del módulo Contabilidad.
 *
 * El balance de prueba abierto **por tercero**: la misma cuenta aparece una vez
 * por cada contacto con movimiento en ella, con su identificación y su nombre.
 * Sirve para responder "¿de quién es este saldo?", que el balance plano no
 * contesta.
 *
 * Dos particularidades frente a sus hermanos:
 *
 * - Suma un parámetro opcional, **contacto**, para acotar a un solo tercero.
 *   Va como control aparte del formulario compartido y se proyecta dentro del
 *   panel de parámetros.
 * - **No lleva fila de totales.** El ERP anterior la quitó a propósito (su
 *   plantilla la deja comentada con la referencia a la tarea 1517) y tiene
 *   sentido: al repetirse la cuenta por contacto, sumar la columna no da el
 *   movimiento del periodo sino un número sin significado contable.
 *
 * Como el balance de prueba, exige que ambas fechas caigan en el mismo año.
 */
@Component({
  selector: 'app-balance-prueba-contacto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    SaldosCuentaTableComponent,
  ],
  templateUrl: './balance-prueba-contacto.component.html',
  styleUrl: './balance-prueba-contacto.component.scss',
})
export class BalancePruebaContactoComponent extends InformeCuentasPageBase<
  SaldoCuentaContactoRow,
  InformeCuentasContactoParams
> {
  protected readonly service = inject(BalancePruebaContactoService);
  protected readonly archivo = 'balance-prueba-contacto';

  /**
   * Tercero por el que acotar (opcional). Va fuera del `FormGroup` compartido
   * —que solo declara los parámetros comunes— y se suma en `buildParams()`.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  protected get nombre(): string {
    return this.t().entities.balancePruebaContacto.name;
  }

  protected override rangeValidator(): ValidatorFn {
    return rangoFechasMismoAnio('fecha_desde', 'fecha_hasta');
  }

  protected override buildParams(): InformeCuentasContactoParams {
    return { ...super.buildParams(), contacto: this.contacto.value?.id ?? null };
  }
}
