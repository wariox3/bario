import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type {
  InformeBasesRow,
  InformeMontoColumn,
} from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import type { AppDict } from '@erp/i18n';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { InformeBaseService } from '../../base.service';

/**
 * Informe **Base** del módulo Contabilidad.
 *
 * Lista los **movimientos que aportan base gravable**: una línea contable por
 * fila, con el documento que la originó, su tercero, el débito/crédito y la
 * base. Es el insumo de las declaraciones, de ahí que baje al detalle en vez de
 * quedarse en saldos.
 *
 * El primero de los cuatro informes **planos**, y por eso el que estrena tres
 * cosas de la tabla compartida:
 *
 * - **Otros importes.** No recorre el plan de cuentas, así que no tiene saldo
 *   anterior ni final: sus columnas son débito, crédito y base. Por eso las
 *   columnas de importe van como dato (`montosDe`) y no fijas en la tabla.
 * - **Sin jerarquía.** Todas sus filas son del mismo tipo, así que el
 *   tratamiento de subtotal/detalle atenuaría la tabla entera sin distinguir
 *   nada.
 * - **Sin aviso de descuadre.** Lista lo que pasó en el rango sobre las cuentas
 *   que exigen base; no hay ninguna razón para que débito iguale a crédito.
 *
 * `solo_con_saldo` tampoco aplica —el backend lo ignora en los planos— así que
 * el panel no lo ofrece. Tampoco hay PDF: el ERP anterior ni siquiera ponía el
 * botón en esta pantalla.
 */
@Component({
  selector: 'app-informe-base',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss',
})
export class InformeBaseComponent extends MovimientoInformePageBase<InformeBasesRow> {
  protected readonly service = inject(InformeBaseService);
  protected readonly archivo = 'base';

  /** Tercero por el que acotar (opcional). Viaja como filtro `contacto_id`. */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  constructor() {
    super();
    // También deja viejo el informe ya generado. Va acá y no en la base porque
    // los campos de la subclase recién existen a esta altura.
    this.watchParam(this.contacto);
  }

  protected get nombre(): string {
    return this.t().entities.informeBase.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.informeBase.empty;
  }

  /** Débito, crédito y base: este informe no tiene saldo anterior ni final. */
  protected override montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [
      { field: 'debito', label: columns.debito },
      { field: 'credito', label: columns.credito },
      { field: 'base', label: columns.base },
    ];
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({ contacto: this.contacto.value, numero: null, comprobante: null });
  }
}
