import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent, ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type { InformeMovimientoRow } from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { AuxiliarGeneralService } from '../../auxiliar-general.service';

/** Master de comprobantes contables, para el selector con búsqueda. */
const COMPROBANTE_ENDPOINT = '/contabilidad/comprobante/seleccionar/';

/**
 * Informe **Auxiliar general** del módulo Contabilidad.
 *
 * El más detallado de la familia: sobre el mismo esqueleto del balance de
 * prueba —el plan de cuentas con el movimiento de un rango— cuelga de cada
 * auxiliar primero sus **terceros** y después todos sus **movimientos**, con
 * comprobante, número y fecha. Es lo que uno espera de un auxiliar, y lo que el
 * *auxiliar de cuenta* del ERP anterior prometía sin cumplir.
 *
 * Comparte todo con el balance de prueba salvo tres cosas: el discriminador del
 * informe, las cinco columnas de detalle (`showContacto` + `showMovimiento`) y
 * los tres parámetros propios de abajo.
 *
 * Exige que **ambas fechas caigan en el mismo año** (lo hereda de la base). No
 * es la regla del ERP anterior —aquel auxiliar solo validaba el orden—, pero el
 * contrato nuevo calcula `saldo_anterior` también acá, contra la apertura del
 * ejercicio: un rango a caballo entre dos años daría un informe que no cuadra.
 */
@Component({
  selector: 'app-auxiliar-general',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputNumberModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    ErpApiAutocompleteComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './auxiliar-general.component.html',
  styleUrl: './auxiliar-general.component.scss',
})
export class AuxiliarGeneralComponent extends MovimientoInformePageBase<InformeMovimientoRow> {
  protected readonly service = inject(AuxiliarGeneralService);
  protected readonly archivo = 'auxiliar-general';

  protected readonly comprobanteEndpoint = COMPROBANTE_ENDPOINT;

  /**
   * Parámetros propios, fuera del `FormGroup` compartido —que solo declara los
   * comunes— y traducidos a filtros dinámicos en `extraFilters()`.
   *
   * Los tres son **selectores o números concretos**, no texto libre: el filtro
   * viaja con `=` contra el movimiento, así que un nombre tecleado a medias no
   * traería nada. El comprobante era un input numérico suelto en el ERP
   * anterior porque su master no existía todavía; ahora sí, y se elige.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);
  protected readonly numero = new FormControl<number | null>(null);
  protected readonly comprobante = new FormControl<ErpSelectOption | null>(null);

  constructor() {
    super();
    // Los tres también dejan viejo el informe ya generado. Va acá y no en la
    // base porque los campos de la subclase recién existen a esta altura.
    this.watchParam(this.contacto);
    this.watchParam(this.numero);
    this.watchParam(this.comprobante);
  }

  protected get nombre(): string {
    return this.t().entities.auxiliarGeneral.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.auxiliarGeneral.empty;
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({
      contacto: this.contacto.value,
      numero: this.numero.value,
      comprobante: this.comprobante.value,
    });
  }
}
