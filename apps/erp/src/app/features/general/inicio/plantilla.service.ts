import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { BaseHttpService } from '@reddoc/core';

/**
 * Archivo de plantilla que siembra los datos iniciales de un contenedor nuevo.
 *
 * Hoy hay uno solo y lo elige el front, no la persona: el asistente ofrece
 * "cargar datos", no "elegir plantilla". Si algún día hay varias (por país o
 * por rubro), esto pasa a ser un parámetro del método.
 */
const PLANTILLA_GENERAL = '01_general.json';

/**
 * Lo que dejó la siembra.
 *
 * `modelos` viene keyed por la **etiqueta Django** del modelo
 * (`app.NombreModelo`, ej. `contabilidad.ConCuenta`) con la cantidad de
 * registros creados. Es un mapa abierto a propósito: el backend puede sumar
 * modelos a la plantilla sin que el front deje de compilar, así que se tipa como
 * `Record<string, number>` y la pantalla resuelve el nombre legible de cada
 * clave contra el dict (cayendo a la clave cruda si todavía no está traducida).
 */
export interface PlantillaCargarResponse {
  readonly modelos: Readonly<Record<string, number>>;
  /**
   * El mismo parámetro que decidió mostrar el asistente, ya recalculado.
   *
   * Viene en la respuesta para no tener que releer `/general/parametro/` después
   * de cargar: la pantalla adopta este valor tal cual.
   */
  readonly gen_asistente_datos_iniciales: boolean;
}

/**
 * Datos iniciales de un contenedor recién creado (`/general/plantilla/`).
 *
 * Dos salidas, ambas terminales: **cargar** siembra los maestros mínimos desde
 * la plantilla y **descartar** deja el contenedor en blanco a propósito. Las dos
 * apagan `gen_asistente_datos_iniciales` en el backend, así que después de
 * cualquiera de las dos la invitación no vuelve (ver `ParametroService`).
 */
@Injectable({ providedIn: 'root' })
export class PlantillaService extends BaseHttpService {
  private readonly resourcePath = '/general/plantilla/';

  /** Siembra el contenedor con los maestros de la plantilla general. */
  cargar(): Observable<PlantillaCargarResponse> {
    return this.post<PlantillaCargarResponse>(`${this.resourcePath}cargar/`, {
      archivo: PLANTILLA_GENERAL,
    });
  }

  /** Renuncia a la plantilla: el contenedor arranca vacío. */
  descartar(): Observable<void> {
    return this.post<void>(`${this.resourcePath}descartar/`, {});
  }
}
