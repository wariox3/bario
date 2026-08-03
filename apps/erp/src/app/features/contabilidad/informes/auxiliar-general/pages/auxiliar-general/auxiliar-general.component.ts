import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import type {
  InformeCuentasMovimientoParams,
  SaldoCuentaMovimientoRow,
} from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { SaldosCuentaTableComponent } from '../../../../shared/components/saldos-cuenta-table/saldos-cuenta-table.component';
import { AuxiliarGeneralService } from '../../auxiliar-general.service';

/**
 * Informe **Auxiliar general** del módulo Contabilidad.
 *
 * El primero de la familia que baja al **movimiento**: cada fila es un
 * documento que tocó una cuenta —comprobante, número y fecha— con su tercero y
 * el saldo corrido. Es lo que uno espera de un auxiliar, y lo que el *auxiliar
 * de cuenta* del ERP anterior prometía sin cumplir (ver `PENDIENTES.md`, §5).
 *
 * Tres parámetros propios sobre los comunes: **contacto**, **número** de
 * documento y **comprobante**. Van como controles aparte del formulario
 * compartido y se proyectan en el panel de parámetros.
 *
 * Dos cosas heredadas del original que conviene no "corregir" sin preguntar:
 *
 * - **Sin PDF.** Su método `imprimir()` estaba comentado entero, así que el
 *   botón no hacía nada. Acá directamente no se ofrece.
 * - **No exige que las fechas caigan en el mismo año**, a diferencia del balance
 *   de prueba: al listar movimientos no hay saldo de apertura que cuadrar.
 */
@Component({
  selector: 'app-auxiliar-general',
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
  templateUrl: './auxiliar-general.component.html',
  styleUrl: './auxiliar-general.component.scss',
})
export class AuxiliarGeneralComponent extends InformeCuentasPageBase<
  SaldoCuentaMovimientoRow,
  InformeCuentasMovimientoParams
> {
  protected readonly service = inject(AuxiliarGeneralService);
  protected readonly archivo = 'auxiliar-general';

  /**
   * Parámetros propios, fuera del `FormGroup` compartido —que solo declara los
   * comunes— y sumados en `buildParams()`.
   *
   * `comprobante` es un número porque así lo pedía el ERP anterior (un input
   * numérico suelto). Lo natural sería un selector del master de comprobantes,
   * pero ese master todavía no existe en este ERP.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);
  protected readonly numero = new FormControl<number | null>(null);
  protected readonly comprobante = new FormControl<number | null>(null);

  protected get nombre(): string {
    return this.t().entities.auxiliarGeneral.name;
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
