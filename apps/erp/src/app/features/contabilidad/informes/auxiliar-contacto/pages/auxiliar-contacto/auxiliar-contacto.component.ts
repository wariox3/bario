import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpApiAutocompleteComponent, ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type { InformeAuxiliarContactoRow } from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { AuxiliarContactoService } from '../../auxiliar-contacto.service';

/** Master de comprobantes contables, para el selector con búsqueda. */
const COMPROBANTE_ENDPOINT = '/contabilidad/comprobante/seleccionar/';

/**
 * Informe **Auxiliar por contacto** del módulo Contabilidad.
 *
 * Bajo cada auxiliar del plan va **cada tercero seguido de sus asientos**. Es la
 * diferencia con el auxiliar general, que sobre las mismas cuentas pone primero
 * todos los terceros y después todos los movimientos: acá el detalle queda
 * pegado a su tercero, que es como se lee un auxiliar de cartera.
 *
 * Mismos tres parámetros propios que el auxiliar general (contacto, número,
 * comprobante), porque filtra al mismo nivel.
 *
 * **Recupera la fila de totales**, que el ERP anterior había quitado por la
 * misma razón que el balance por contacto (tarea 1517): allá se sumaban las
 * filas recibidas y la cuenta repetida por tercero daba un total sin sentido.
 * Acá los totales vienen de `totales/`, que suma solo las filas de tipo
 * `AUXILIAR`.
 *
 * ⚠️ **Sus filas de detalle solo se identifican por `movimiento_id`**: este
 * informe no trae comprobante, número ni fecha (sí el auxiliar general), así que
 * la tabla enciende la columna del id. Mismo hueco que el auxiliar de cuenta —
 * ver `PENDIENTES.md` §0.
 */
@Component({
  selector: 'app-auxiliar-contacto',
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
  templateUrl: './auxiliar-contacto.component.html',
  styleUrl: './auxiliar-contacto.component.scss',
})
export class AuxiliarContactoComponent extends MovimientoInformePageBase<InformeAuxiliarContactoRow> {
  protected readonly service = inject(AuxiliarContactoService);
  protected readonly archivo = 'auxiliar-contacto';

  protected readonly comprobanteEndpoint = COMPROBANTE_ENDPOINT;

  /**
   * Parámetros propios, fuera del `FormGroup` compartido —que solo declara los
   * comunes— y traducidos a filtros dinámicos en `extraFilters()`.
   *
   * El comprobante era un input numérico suelto en el ERP anterior porque su
   * master no existía todavía; ahora sí, y se elige.
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
    return this.t().entities.auxiliarContacto.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.auxiliarContacto.empty;
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({
      contacto: this.contacto.value,
      numero: this.numero.value,
      comprobante: this.comprobante.value,
    });
  }
}
