import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/** Respuesta de los endpoints que devuelven el logotipo ya convertido. */
export interface LogotipoResponse {
  /** PNG en base64 **sin** el prefijo `data:`. `null` si el tenant no cargó ninguno. */
  readonly logotipo: string | null;
}

/**
 * El logotipo de la empresa, que llevan impresos los documentos.
 *
 * Vive fuera de `ConfiguracionService` porque el backend también lo separó: es
 * la misma fila `gen_configuracion`, pero pesa decenas de KB y casi nunca
 * cambia, así que `obtener/` no lo devuelve y tiene sus propias tres rutas.
 *
 * Tenant-scoped, como todo `/general/*`.
 */
@Injectable({ providedIn: 'root' })
export class EmpresaLogotipoService extends BaseHttpService {
  private readonly resourcePath = '/general/configuracion/';

  /** Logotipo actual del tenant, o `null` si no hay ninguno. */
  obtener(): Observable<LogotipoResponse> {
    return this.get<LogotipoResponse>(`${this.resourcePath}logotipo/`);
  }

  /**
   * Reemplaza el logotipo. Acepta JPG, PNG o WEBP hasta 5 MB; el backend lo
   * convierte a PNG de 400 px de lado y devuelve el resultado, así que quien
   * llama pinta lo que vuelve en vez de volver a pedirlo.
   */
  cargar(file: File): Observable<LogotipoResponse> {
    return this.postFile<LogotipoResponse>(
      `${this.resourcePath}cargar-logotipo/`,
      file,
      undefined,
      'logotipo',
    );
  }

  /** Deja el logotipo en `null`. Idempotente: sin logotipo previo responde igual. */
  quitar(): Observable<void> {
    return this.delete<void>(`${this.resourcePath}quitar-logotipo/`);
  }
}
