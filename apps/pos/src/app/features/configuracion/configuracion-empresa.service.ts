import { Injectable } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from './configuracion-caja.model';

/** Lo que `configuracion/campos/` devuelve de los campos que lee el POS. */
interface CamposPos {
  readonly ven_pos_documento_tipo?: number | null;
  readonly ven_pos_informacion_superior?: string | null;
  readonly ven_pos_informacion_inferior?: string | null;
}

/** Textos fijos que el backend imprime arriba y abajo de cada tirilla. */
export interface TextosTirilla {
  readonly superior: string;
  readonly inferior: string;
}

/**
 * La parte de la configuración del POS que es **de la empresa**, no de la caja:
 * el tipo de documento con el que facturan todas sus cajas y los textos de la
 * tirilla. Viven en `GenConfiguracion` (singleton por tenant):
 * `ven_pos_documento_tipo` y `ven_pos_informacion_superior` / `_inferior`.
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

  textosTirilla(): Observable<TextosTirilla> {
    return this.get<CamposPos>(
      '/general/configuracion/campos/',
      { campos: 'ven_pos_informacion_superior,ven_pos_informacion_inferior' },
      { errorToast: false },
    ).pipe(map(aTextos));
  }

  /** En blanco viaja `null`: el backend rechaza el string vacío (`minLength: 1`). */
  guardarTextosTirilla(textos: TextosTirilla): Observable<TextosTirilla> {
    return this.patch<CamposPos>(
      '/general/configuracion/actualizar/',
      {
        ven_pos_informacion_superior: textos.superior.trim() || null,
        ven_pos_informacion_inferior: textos.inferior.trim() || null,
      },
      { errorToast: false },
    ).pipe(map(aTextos));
  }
}

function aTextos(campos: CamposPos): TextosTirilla {
  return {
    superior: campos.ven_pos_informacion_superior ?? '',
    inferior: campos.ven_pos_informacion_inferior ?? '',
  };
}

/**
 * Solo los tipos de la familia POS: si en el backend quedara otro (el schema no
 * dice que lo valide), la caja lo trata como no configurado en vez de facturar
 * con un documento que no es suyo.
 */
function aTipoPos(valor: number | null | undefined): PosDocumentoTipoId | null {
  return POS_DOCUMENTO_TIPOS.find((tipo) => tipo === valor) ?? null;
}
