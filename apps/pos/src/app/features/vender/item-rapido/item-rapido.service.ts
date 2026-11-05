import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { ErpSelectDataService, type ErpSelectOption } from '@reddoc/core';

interface ImpuestoFila {
  readonly id: number;
  readonly nombre: string;
  readonly nombre_extendido?: string | null;
}

/** Impuestos de venta del tenant, para el alta rápida de ítems. */
@Injectable({ providedIn: 'root' })
export class ItemRapidoService {
  private readonly data = inject(ErpSelectDataService);

  /** Etiquetados con el nombre extendido ("IVA 19% ventas"), que es el que se reconoce. */
  impuestosVenta(): Observable<ErpSelectOption[]> {
    return this.data
      .fetchOptions<ImpuestoFila>('/general/impuesto/seleccionar/', { venta: 'True' })
      .pipe(
        map((filas) => filas.map((f) => ({ id: f.id, nombre: f.nombre_extendido || f.nombre }))),
      );
  }
}
