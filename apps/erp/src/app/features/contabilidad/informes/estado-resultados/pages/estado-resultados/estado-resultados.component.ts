import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type {
  InformeEstadoRow,
  InformeMontoColumn,
} from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { EstadoResultadosService } from '../../estado-resultados.service';

/**
 * Master de centros de costo. No hay componente propio: el ERP los resuelve con
 * el autocomplete genérico, igual que en `sede-form` y `contrato-form`.
 */
const CENTRO_COSTO_ENDPOINT = '/contabilidad/centro-costo/seleccionar/';

/**
 * Informe **Estado de resultados** del módulo Contabilidad.
 *
 * El P&L del periodo: cada cuenta de resultado que movió, con su saldo y su
 * ubicación en el plan (clase y grupo).
 *
 * Es el más simple de los nueve: **solo se parametriza por el periodo**. El ERP
 * anterior declaraba también rango de cuentas y contacto, pero su plantilla
 * nunca los renderizaba —viajaban siempre vacíos—, y tiene sentido: un estado
 * financiero cubre las clases que le corresponden, no un rango elegido a mano.
 *
 * Es también el que estrena la última pieza que le faltaba a la tabla
 * compartida: **`[showUbicacion]`**, clase y grupo en columnas. Los estados no
 * recorren la jerarquía fila por fila —no tienen subtotales— sino que ubican
 * cada cuenta con dos columnas propias, así que el bloque no se podía derivar de
 * los que ya había.
 *
 * Acota opcionalmente por **centro de costo**, que es la lectura clásica de un
 * P&L ("resultado por centro de costo"). Ojo con el nombre: no es lo mismo que
 * la columna *grupo*, que es un nivel del plan de cuentas — son dos conceptos
 * distintos que el ERP tiene enredados en la consulta de movimientos (ver
 * `PENDIENTES.md` §9).
 *
 * `solo_con_saldo` no se ofrece: el backend lo ignora en los planos.
 */
@Component({
  selector: 'app-estado-resultados',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpApiAutocompleteComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './estado-resultados.component.html',
  styleUrl: './estado-resultados.component.scss',
})
export class EstadoResultadosComponent extends MovimientoInformePageBase<InformeEstadoRow> {
  protected readonly service = inject(EstadoResultadosService);
  protected readonly archivo = 'estado-resultados';

  protected readonly centroCostoEndpoint = CENTRO_COSTO_ENDPOINT;

  /** Centro de costo por el que acotar (opcional). Viaja como `centro_costo_id`. */
  protected readonly centroCosto = new FormControl<ErpSelectOption | null>(null);

  constructor() {
    super();
    // También deja viejo el informe ya generado. Va acá y no en la base porque
    // los campos de la subclase recién existen a esta altura.
    this.watchParam(this.centroCosto);
  }

  protected get nombre(): string {
    return this.t().entities.estadoResultados.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.estadoResultados.empty;
  }

  /** Un único importe: el saldo de la cuenta en el periodo. */
  protected override montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [{ field: 'saldo', label: columns.saldo }];
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({ centroCosto: this.centroCosto.value });
  }
}
