import { Injectable } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from './configuracion-caja.model';

/** Lo que `configuracion/campos/` devuelve del campo que lee el POS. */
interface CamposPos {
  readonly ven_pos_documento_tipo?: number | null;
}

/**
 * La parte de la configuración del POS que es **de la empresa**, no de la caja:
 * el tipo de documento con el que facturan todas sus cajas. Vive en
 * `GenConfiguracion.ven_pos_documento_tipo` (singleton por tenant).
 *
 * Sin toast global de error: el store y la página de configuración dicen qué
 * pasó en su contexto.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionEmpresaService extends BaseHttpService {
  tipoDocumentoPos(): Observable<PosDocumentoTipoId | null> {
    return this.get<CamposPos>(
      '/general/configuracion/campos/',
      { campos: 'ven_pos_documento_tipo' },
      { errorToast: false },
    ).pipe(map((campos) => aTipoPos(campos.ven_pos_documento_tipo)));
  }

  guardarTipoDocumentoPos(tipo: PosDocumentoTipoId): Observable<PosDocumentoTipoId | null> {
    return this.patch<CamposPos>(
      '/general/configuracion/actualizar/',
      { ven_pos_documento_tipo: tipo },
      { errorToast: false },
    ).pipe(map((campos) => aTipoPos(campos.ven_pos_documento_tipo)));
  }
}

/**
 * Solo los tipos de la familia POS: si en el backend quedara otro (el schema no
 * dice que lo valide), la caja lo trata como no configurado en vez de facturar
 * con un documento que no es suyo.
 */
function aTipoPos(valor: number | null | undefined): PosDocumentoTipoId | null {
  return POS_DOCUMENTO_TIPOS.find((tipo) => tipo === valor) ?? null;
}
