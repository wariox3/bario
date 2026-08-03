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
import { EstadoResultadosService } from '../../estado-resultados.service';

/**
 * Informe **Estado de resultados** del módulo Contabilidad.
 *
 * El P&L del periodo: cada cuenta de resultado con su saldo, ubicada en el plan
 * por clase y grupo.
 *
 * Es el más simple de la familia: **solo se parametriza por el periodo**. El
 * ERP anterior declaraba también rango de cuentas y contacto, pero su plantilla
 * nunca los renderizaba —viajaban siempre vacíos—, y tiene sentido: un estado
 * financiero cubre las clases que le corresponden, no un rango elegido a mano.
 * Por eso acá no se ofrecen y no se mandan.
 *
 * Comparte tabla con el estado de situación financiera
 * (`<app-estado-financiero-table>`): en el ERP anterior son la misma pantalla
 * con distinto endpoint. Tampoco ofrece PDF.
 */
@Component({
  selector: 'app-estado-resultados',
  standalone: true,
  imports: [
    ListShellComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    EstadoFinancieroTableComponent,
  ],
  templateUrl: './estado-resultados.component.html',
  styleUrl: './estado-resultados.component.scss',
})
export class EstadoResultadosComponent extends InformeCuentasPageBase<
  EstadoFinancieroRow,
  InformePeriodoParams
> {
  protected readonly service = inject(EstadoResultadosService);
  protected readonly archivo = 'estado-resultados';

  protected get nombre(): string {
    return this.t().entities.estadoResultados.name;
  }

  protected override buildParams(): InformePeriodoParams {
    const value = this.form.getRawValue();
    return {
      fecha_desde: toIsoDate(value.fecha_desde) ?? '',
      fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
    };
  }
}
