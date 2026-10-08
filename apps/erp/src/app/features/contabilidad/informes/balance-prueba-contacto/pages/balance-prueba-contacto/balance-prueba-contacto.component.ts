import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type { InformeContactoRow } from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { BalancePruebaContactoService } from '../../balance-prueba-contacto.service';

/**
 * Informe **Balance de prueba por contacto** del módulo Contabilidad.
 *
 * El balance de prueba abierto **por tercero**: bajo cada auxiliar del plan
 * cuelga una fila por cada contacto con movimiento en esa cuenta, con su
 * identificación y su nombre. Responde "¿de quién es este saldo?", que el
 * balance plano no contesta. No baja hasta el asiento — eso es el auxiliar
 * general.
 *
 * Acota opcionalmente por un tercero. Es el único parámetro propio: número y
 * comprobante identifican un asiento, y este informe no llega a ese nivel.
 *
 * **Recupera la fila de totales**, que el ERP anterior había quitado. Allá la
 * suma se hacía en el front sobre las filas recibidas, y con la cuenta repetida
 * por contacto daba un número sin significado contable. Acá los totales vienen
 * de la acción `totales/`, que suma **solo las filas de tipo `AUXILIAR`** — el
 * desglose por tercero no entra en la cuenta, así que el cuadre es el real.
 */
@Component({
  selector: 'app-balance-prueba-contacto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './balance-prueba-contacto.component.html',
  styleUrl: './balance-prueba-contacto.component.scss',
})
export class BalancePruebaContactoComponent extends MovimientoInformePageBase<InformeContactoRow> {
  protected readonly service = inject(BalancePruebaContactoService);
  protected readonly archivo = 'balance-prueba-contacto';

  /** Tercero por el que acotar (opcional). Viaja como filtro `contacto_id`. */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  constructor() {
    super();
    // También deja viejo el informe ya generado. Va acá y no en la base porque
    // los campos de la subclase recién existen a esta altura.
    this.watchParam(this.contacto);
  }

  protected get nombre(): string {
    return this.t().entities.balancePruebaContacto.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.balancePruebaContacto.empty;
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({ contacto: this.contacto.value, numero: null, comprobante: null });
  }
}
