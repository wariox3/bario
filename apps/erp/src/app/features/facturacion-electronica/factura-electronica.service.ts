import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Habilitación de facturación electrónica del contenedor.
 *
 * Endpoints de `/general/factura-electronica/`, el trámite ante el proveedor —
 * distinto de `ParametroService`, que solo **lee** en qué estado quedó
 * (`gen_factura_electronica_activa`, `gen_factura_electronica_emisor`).
 */
@Injectable({ providedIn: 'root' })
export class FacturaElectronicaService extends BaseHttpService {
  private readonly resourcePath = '/general/factura-electronica/';

  /**
   * Da de alta la empresa como emisor ante el proveedor.
   *
   * **Sin body a propósito**: el backend arma el registro con lo que hay en
   * `GenConfiguracion`, así que la configuración tiene que estar **guardada
   * antes** de llamar acá. Al terminar, `gen_factura_electronica_emisor` deja
   * de ser `null` — y a partir de ahí esos datos ya no se editan desde el ERP.
   */
  crearEmisor(): Observable<void> {
    return this.post<void>(`${this.resourcePath}crear-emisor/`, null);
  }
}
