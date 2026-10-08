import { Component, inject } from '@angular/core';
import { ListShellComponent } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type {
  InformeEstadoRow,
  InformeMontoColumn,
} from '../../../../shared/movimiento-informe.types';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { EstadoSituacionFinancieraService } from '../../estado-situacion-financiera.service';

/**
 * Informe **Estado de situación financiera** del módulo Contabilidad.
 *
 * El balance general del periodo: cada cuenta con su saldo, ubicada en el plan
 * por clase y grupo. Comparte forma exacta con el estado de resultados —mismas
 * columnas, mismo único importe, mismo parámetro— y solo cambia qué clases
 * cubre, cosa que decide el backend.
 *
 * Como su hermano, **solo se parametriza por el periodo**: un estado financiero
 * cubre las clases que le corresponden, no un rango elegido a mano. No ofrece
 * centro de costo —ese filtro se pidió solo para el P&L— ni `solo_con_saldo`,
 * que el backend ignora en los planos.
 */
@Component({
  selector: 'app-estado-situacion-financiera',
  standalone: true,
  imports: [
    ListShellComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './estado-situacion-financiera.component.html',
  styleUrl: './estado-situacion-financiera.component.scss',
})
export class EstadoSituacionFinancieraComponent extends MovimientoInformePageBase<InformeEstadoRow> {
  protected readonly service = inject(EstadoSituacionFinancieraService);
  protected readonly archivo = 'estado-situacion-financiera';

  protected get nombre(): string {
    return this.t().entities.estadoSituacionFinanciera.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.estadoSituacionFinanciera.empty;
  }

  /** Un único importe: el saldo de la cuenta en el periodo. */
  protected override montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [{ field: 'saldo', label: columns.saldo }];
  }
}
