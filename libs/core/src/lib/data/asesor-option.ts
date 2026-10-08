import type { ErpSelectOption } from './erp-select-data.service';

/**
 * Etiqueta canónica de un asesor en los selects y fichas del ERP.
 *
 * `general/asesor/seleccionar/` es el raro del lote: devuelve `{ id, nombre_corto }`
 * y no el `nombre` que `lib-api-select` muestra y filtra por defecto. De ahí que
 * el campo vaya con `[displayWith]="asesorLabel"` **y** `filterBy="nombre_corto"`
 * —sin lo segundo la persona teclearía lo que ve y no encontraría nada—.
 *
 * Vive acá porque la misma etiqueta la necesitan tres sitios: el select de asesor
 * (`@reddoc/ui`), y las fichas de documento, que resuelven el nombre contra el
 * catálogo porque el read del documento solo trae la FK.
 */
export function asesorLabel(option: ErpSelectOption): string {
  return String(option['nombre_corto'] ?? option.nombre ?? '');
}
