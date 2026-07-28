import { Component, inject } from '@angular/core';
import { ListShellComponent } from '@reddoc/feature-base';
import { toIsoDate } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import type {
  EstadoFinancieroRow,
  InformePeriodoParams,
} from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { EstadoFinancieroTableComponent } from '../../../../shared/components/estado-financiero-table/estado-financiero-table.component';
import { EstadoSituacionFinancieraService } from '../../estado-situacion-financiera.service';

/**
 * Informe **Estado de situación financiera** del módulo Contabilidad.
 *
 * El balance general a la fecha: cada cuenta de activo, pasivo y patrimonio con
 * su saldo, ubicada en el plan por clase y grupo.
 *
 * Gemelo del estado de resultados —en el ERP anterior son la misma pantalla con
 * distinto endpoint—, así que comparte con él parámetros, tabla y decisiones:
 * solo se parametriza por el periodo, no ofrece PDF y no lleva fila de totales.
 * Lo único propio es el endpoint y el nombre.
 */
@Component({
  selector: 'app-estado-situacion-financiera',
  standalone: true,
  imports: [
    ListShellComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    EstadoFinancieroTableComponent,
  ],
  templateUrl: './estado-situacion-financiera.component.html',
  styleUrl: './estado-situacion-financiera.component.scss',
})
export class EstadoSituacionFinancieraComponent extends InformeCuentasPageBase<
  EstadoFinancieroRow,
  InformePeriodoParams
> {
  protected readonly service = inject(EstadoSituacionFinancieraService);
  protected readonly archivo = 'estado-situacion-financiera';

  protected get nombre(): string {
    return this.t().entities.estadoSituacionFinanciera.name;
  }

  protected override buildParams(): InformePeriodoParams {
    const value = this.form.getRawValue();
    return {
      fecha_desde: toIsoDate(value.fecha_desde) ?? '',
      fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
    };
  }
}
