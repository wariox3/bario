import { Injectable } from '@angular/core';
import {
  InventarioInformeService,
  type InventarioInformeId,
} from '../shared/inventario-informe.service';
import type { HistorialMovimiento } from './historial-movimiento.model';

/**
 * Servicio HTTP del informe **Historial de movimiento**.
 *
 * Toda la mecánica —las dos acciones sobre `/inventario/informe/`, la
 * paginación, la forma de cada body— vive en `InventarioInformeService`; acá
 * solo se declara el discriminador.
 *
 * El único que no parte del ítem: lista las **líneas de documento** que movieron
 * inventario, sobre `GenDocumentoDetalle`.
 *
 * **Columnas sin confirmar**: el schema solo declara el serializer del informe
 * por defecto, así que la fila de este se mantiene como estaba hasta que backend
 * publique sus campos. Ver `PENDIENTES.md`.
 */
@Injectable({ providedIn: 'root' })
export class HistorialMovimientoService extends InventarioInformeService<HistorialMovimiento> {
  protected readonly informe: InventarioInformeId = 'historial_movimiento';
}
