import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import { buildRangoParams } from '../../../../shared/informe-cuentas.utils';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { BaseMovimientosTableComponent } from '../../components/base-movimientos-table/base-movimientos-table.component';
import { InformeBaseService } from '../../base.service';
import type { BaseMovimientoRow, InformeBaseParams } from '../../base.model';

/**
 * Informe **Base** del módulo Contabilidad.
 *
 * Lista los **movimientos que aportan base gravable**: una línea contable por
 * fila, con el documento que la originó, su tercero, el débito/crédito y la
 * base. Es el insumo de las declaraciones, de ahí que baje al detalle en vez de
 * quedarse en saldos.
 *
 * Es el primero de la familia que se sale del molde en las dos puntas:
 *
 * - **Tabla propia** (`<app-base-movimientos-table>`): no comparte ninguna
 *   columna de saldos con sus hermanos.
 * - **Menos parámetros**: solo periodo, rango de cuentas y contacto. Sin las
 *   banderas de cierre y cuentas con movimiento, que a nivel de línea no
 *   aplican — por eso arma sus parámetros con `buildRangoParams` en vez del
 *   builder completo.
 *
 * Tampoco ofrece PDF: el ERP anterior ni siquiera ponía el botón.
 */
@Component({
  selector: 'app-informe-base',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    BaseMovimientosTableComponent,
  ],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
})
export class InformeBaseComponent extends InformeCuentasPageBase<
  BaseMovimientoRow,
  InformeBaseParams
> {
  protected readonly service = inject(InformeBaseService);
  protected readonly archivo = 'base';

  /**
   * Tercero por el que acotar (opcional). Ojo: este informe manda el parámetro
   * como `contacto_id`, no `contacto` como el resto.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  protected get nombre(): string {
    return this.t().entities.informeBase.name;
  }

  protected override buildParams(): InformeBaseParams {
    return {
      ...buildRangoParams(this.form),
      contacto_id: this.contacto.value?.id ?? null,
    };
  }
}
