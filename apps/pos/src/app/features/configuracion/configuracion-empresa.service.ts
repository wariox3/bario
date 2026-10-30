import { Injectable } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from './configuracion-caja.model';

/** Lo que `configuracion/campos/` devuelve de los campos que lee el POS. */
interface CamposPos {
  readonly ven_pos_documento_tipo?: number | null;
  readonly ven_pos_informacion_superior?: string | null;
  readonly ven_pos_informacion_inferior?: string | null;
  readonly gen_empresa_razon_social?: string | null;
  readonly gen_empresa_nombre_corto?: string | null;
  readonly gen_empresa_numero_identificacion?: string | null;
  readonly gen_empresa_digito_verificacion?: string | null;
  readonly gen_empresa_direccion?: string | null;
  readonly gen_empresa_telefono?: string | null;
  readonly gen_empresa_correo?: string | null;
}

/** Textos fijos que el backend imprime arriba y abajo de cada tirilla. */
export interface TextosTirilla {
  readonly superior: string;
  readonly inferior: string;
}

/** Lo que va arriba de un papel que la caja arma sola (la pre-cuenta). */
export interface EmpresaTirilla {
  readonly nombre: string;
  /** Número de identificación con su dígito de verificación, si lo tiene. */
  readonly identificacion: string;
  readonly direccion: string;
  readonly telefono: string;
  readonly correo: string;
  readonly textos: TextosTirilla;
}

const CAMPOS_EMPRESA_TIRILLA = [
  'gen_empresa_razon_social',
  'gen_empresa_nombre_corto',
  'gen_empresa_numero_identificacion',
  'gen_empresa_digito_verificacion',
  'gen_empresa_direccion',
  'gen_empresa_telefono',
  'gen_empresa_correo',
  'ven_pos_informacion_superior',
  'ven_pos_informacion_inferior',
] as const;

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

  /** Datos de la empresa y textos de la tirilla, en una sola consulta. */
  empresaTirilla(): Observable<EmpresaTirilla> {
    return this.get<CamposPos>(
      '/general/configuracion/campos/',
      { campos: CAMPOS_EMPRESA_TIRILLA.join(',') },
      { errorToast: false },
    ).pipe(map(aEmpresaTirilla));
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

function aEmpresaTirilla(campos: CamposPos): EmpresaTirilla {
  const numero = campos.gen_empresa_numero_identificacion ?? '';
  const dv = campos.gen_empresa_digito_verificacion ?? '';
  return {
    nombre: campos.gen_empresa_razon_social || campos.gen_empresa_nombre_corto || '',
    identificacion: numero && dv ? `${numero}-${dv}` : numero,
    direccion: campos.gen_empresa_direccion ?? '',
    telefono: campos.gen_empresa_telefono ?? '',
    correo: campos.gen_empresa_correo ?? '',
    textos: aTextos(campos),
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
