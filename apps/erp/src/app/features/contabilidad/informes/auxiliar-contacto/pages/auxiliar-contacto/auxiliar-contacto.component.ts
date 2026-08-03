import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import type {
  InformeCuentasMovimientoParams,
  SaldoCuentaContactoRow,
} from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { SaldosCuentaTableComponent } from '../../../../shared/components/saldos-cuenta-table/saldos-cuenta-table.component';
import { AuxiliarContactoService } from '../../auxiliar-contacto.service';

/**
 * Informe **Auxiliar por contacto** del módulo Contabilidad.
 *
 * Saldos de cada cuenta abiertos **por tercero**: mismas columnas que el
 * balance de prueba por contacto, pero acotables por documento. Está a mitad de
 * camino entre aquel y el auxiliar general: filtra como un auxiliar (contacto,
 * número, comprobante) pero se queda en el saldo, sin bajar al movimiento.
 *
 * Hereda del ERP anterior, y conviene no "corregirlo" sin preguntar:
 *
 * - **Sin fila de totales**, igual que el balance por contacto y por la misma
 *   razón (su plantilla los deja comentados citando la tarea 1517): al
 *   repetirse la cuenta por contacto, sumar la columna no da el movimiento del
 *   periodo.
 * - **Sin PDF**: su método `imprimir()` estaba comentado entero.
 * - **No exige que ambas fechas caigan en el mismo año**, a diferencia del
 *   balance de prueba.
 */
@Component({
  selector: 'app-auxiliar-contacto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputNumberModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    SaldosCuentaTableComponent,
  ],
  templateUrl: './auxiliar-contacto.component.html',
  styleUrl: './auxiliar-contacto.component.scss',
})
export class AuxiliarContactoComponent extends InformeCuentasPageBase<
  SaldoCuentaContactoRow,
  InformeCuentasMovimientoParams
> {
  protected readonly service = inject(AuxiliarContactoService);
  protected readonly archivo = 'auxiliar-contacto';

  /**
   * Parámetros propios, fuera del `FormGroup` compartido —que solo declara los
   * comunes— y sumados en `buildParams()`. Mismo trío que el auxiliar general.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);
  protected readonly numero = new FormControl<number | null>(null);
  protected readonly comprobante = new FormControl<number | null>(null);

  protected get nombre(): string {
    return this.t().entities.auxiliarContacto.name;
  }

  protected override buildParams(): InformeCuentasMovimientoParams {
    return {
      ...super.buildParams(),
      contacto: this.contacto.value?.id ?? null,
      numero: this.numero.value,
      comprobante: this.comprobante.value,
    };
  }
}
