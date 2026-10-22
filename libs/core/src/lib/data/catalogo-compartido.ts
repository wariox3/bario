import { type Signal, effect, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import type { ParamValue } from '../services/base-http.service';
import { ErpSelectDataService, type ErpSelectOption } from './erp-select-data.service';

/** Opciones de `catalogoCompartido`. */
export interface CatalogoCompartidoOptions {
  readonly params?: Record<string, ParamValue>;
  /**
   * Solo carga mientras devuelva `true`. Para la tabla que muestra la columna
   * según un input: leerlo acá adentro lo evalúa ya bindeado (en el constructor
   * daría siempre el default) y no consulta un catálogo que nadie va a ver.
   */
  readonly activo?: () => boolean;
}

/**
 * Catálogo de un `seleccionar` cargado **una vez** para toda una tabla de
 * líneas, para repartirlo a los `<lib-api-select [catalogo]>` de sus filas.
 *
 * Sin esto cada fila consulta su propio catálogo: un documento de 99 líneas
 * pide 99 veces el mismo almacén al abrirse y otras 99 al guardar, cuando cada
 * fila guardada se reconstruye.
 *
 * Vacío mientras carga y si la consulta falla —nunca `null`: un `null` le
 * diría a cada select que traiga el suyo y volvería el fetch por fila. Las
 * celdas pintan igual su valor actual (`lib-api-select` lo antepone si no
 * está en el catálogo).
 *
 * Debe llamarse en contexto de inyección (un field initializer del componente).
 */
export function catalogoCompartido(
  endpoint: string,
  options: CatalogoCompartidoOptions = {},
): Signal<readonly ErpSelectOption[]> {
  const data = inject(ErpSelectDataService);
  const catalogo = signal<readonly ErpSelectOption[]>([]);

  effect((onCleanup) => {
    if (options.activo && !options.activo()) return;
    const sub = data
      .fetchAllOptions(endpoint, options.params)
      .pipe(catchError(() => of<ErpSelectOption[]>([])))
      .subscribe((opciones) => catalogo.set(opciones));
    onCleanup(() => sub.unsubscribe());
  });

  return catalogo.asReadonly();
}
