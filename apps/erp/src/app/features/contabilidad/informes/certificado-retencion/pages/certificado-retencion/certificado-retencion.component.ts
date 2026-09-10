import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption, FilterCondition } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { MovimientoInformePageBase } from '../../../../shared/movimiento-informe-page.base';
import type {
  InformeCertificadoRow,
  InformeMontoColumn,
} from '../../../../shared/movimiento-informe.types';
import { buildFiltrosDetalle } from '../../../../shared/movimiento-informe.utils';
import { MovimientoInformeActionsComponent } from '../../../../shared/components/movimiento-informe-actions/movimiento-informe-actions.component';
import { MovimientoInformeParamsComponent } from '../../../../shared/components/movimiento-informe-params/movimiento-informe-params.component';
import { MovimientoInformeTableComponent } from '../../../../shared/components/movimiento-informe-table/movimiento-informe-table.component';
import { CertificadoRetencionService } from '../../certificado-retencion.service';

/**
 * Informe **Certificado de retención** del módulo Contabilidad.
 *
 * Lo que se le retuvo a cada tercero en el periodo y sobre qué base, agrupado
 * por cuenta de retención. No es un corte contable sino un resumen fiscal, así
 * que no tiene saldos ni baja al asiento: es el más angosto de los nueve.
 *
 * **Migró sin tocar la tabla compartida.** Es configuración pura: sus dos
 * importes ya entraban por `montosDe()` —el mecanismo que estrenó el informe
 * *base*— y el resto sale de `[showContacto]` más apagar jerarquía y descuadre,
 * como todos los planos. Que un informe nuevo no pida nada nuevo es la señal de
 * que la tabla quedó en el nivel de generalidad correcto.
 *
 * El tercero es opcional pero es el filtro natural: un certificado se emite para
 * un tercero.
 */
@Component({
  selector: 'app-certificado-retencion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    MovimientoInformeParamsComponent,
    MovimientoInformeActionsComponent,
    MovimientoInformeTableComponent,
  ],
  templateUrl: './certificado-retencion.component.html',
  styleUrl: './certificado-retencion.component.scss',
})
export class CertificadoRetencionComponent extends MovimientoInformePageBase<InformeCertificadoRow> {
  protected readonly service = inject(CertificadoRetencionService);
  protected readonly archivo = 'certificado-retencion';

  /**
   * El único de los nueve que imprime: `POST
   * /contabilidad/movimiento-informe/pdf/` solo acepta `certificado_retencion`
   * y responde 400 a los otros ocho.
   *
   * El PDF sale con **una hoja por tercero**, así que el tercero del formulario
   * sigue siendo opcional: acotado imprime ese certificado, en blanco imprime
   * los del periodo en un mismo archivo. Es el mismo alcance del ERP anterior,
   * que pegaba a `contabilidad/movimiento/informe-certificado-retencion/` con
   * `pdf: true` y los mismos parámetros de la consulta.
   */
  protected override readonly soportaPdf = true;

  /** Tercero por el que acotar (opcional). Viaja como filtro `contacto_id`. */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  constructor() {
    super();
    // También deja viejo el informe ya generado. Va acá y no en la base porque
    // los campos de la subclase recién existen a esta altura.
    this.watchParam(this.contacto);
  }

  protected get nombre(): string {
    return this.t().entities.certificadoRetencion.name;
  }

  /** Los dos textos del estado vacío, propios de este informe. */
  protected get empty() {
    return this.t().entities.certificadoRetencion.empty;
  }

  /** Base retenida y retenido: este informe no tiene columnas de saldo. */
  protected override montosDe(
    columns: AppDict['entities']['informeCuentas']['columns'],
  ): readonly InformeMontoColumn[] {
    return [
      { field: 'base_retenido', label: columns.baseRetenido },
      { field: 'retenido', label: columns.retenido },
    ];
  }

  protected override extraFilters(): readonly FilterCondition[] {
    return buildFiltrosDetalle({ contacto: this.contacto.value, numero: null, comprobante: null });
  }
}
