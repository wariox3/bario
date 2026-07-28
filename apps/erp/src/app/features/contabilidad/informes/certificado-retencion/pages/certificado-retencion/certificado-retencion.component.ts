import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListShellComponent } from '@reddoc/feature-base';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { InformeCuentasPageBase } from '../../../../shared/informe-cuentas-page.base';
import { buildRangoParams } from '../../../../shared/informe-cuentas.utils';
import type { InformeCuentasRangoContactoParams } from '../../../../shared/informe-cuentas.types';
import { InformeCuentasActionsComponent } from '../../../../shared/components/informe-cuentas-actions/informe-cuentas-actions.component';
import { InformeCuentasParamsComponent } from '../../../../shared/components/informe-cuentas-params/informe-cuentas-params.component';
import { CertificadoRetencionTableComponent } from '../../components/certificado-retencion-table/certificado-retencion-table.component';
import { CertificadoRetencionService } from '../../certificado-retencion.service';
import type { CertificadoRetencionRow } from '../../certificado-retencion.model';

/**
 * Informe **Certificado de retención** del módulo Contabilidad.
 *
 * Lo que se le certifica a cada tercero: cuánto se le retuvo en el periodo y
 * sobre qué base, agrupado por cuenta de retención. Es el respaldo que el
 * tercero necesita para su propia declaración.
 *
 * Comparte con el informe *base* la forma de los parámetros —periodo, rango de
 * cuentas y `contacto_id`, sin las dos banderas— y como aquel lleva tabla
 * propia, porque sus seis columnas no coinciden con las de saldos. A
 * diferencia de *base*, **sí ofrece PDF**, que en este informe es lo esperable:
 * el certificado se imprime y se entrega.
 */
@Component({
  selector: 'app-certificado-retencion',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ListShellComponent,
    ErpContactoSelectComponent,
    InformeCuentasParamsComponent,
    InformeCuentasActionsComponent,
    CertificadoRetencionTableComponent,
  ],
  templateUrl: './certificado-retencion.component.html',
  styleUrl: './certificado-retencion.component.scss',
})
export class CertificadoRetencionComponent extends InformeCuentasPageBase<
  CertificadoRetencionRow,
  InformeCuentasRangoContactoParams
> {
  protected readonly service = inject(CertificadoRetencionService);
  protected readonly archivo = 'certificado-retencion';

  /**
   * Tercero por el que acotar. Opcional, pero es el filtro natural: un
   * certificado se emite para un tercero. Va como `contacto_id`, igual que en
   * el informe *base*.
   */
  protected readonly contacto = new FormControl<ErpSelectOption | null>(null);

  protected get nombre(): string {
    return this.t().entities.certificadoRetencion.name;
  }

  protected override buildParams(): InformeCuentasRangoContactoParams {
    return {
      ...buildRangoParams(this.form),
      contacto_id: this.contacto.value?.id ?? null,
    };
  }
}
