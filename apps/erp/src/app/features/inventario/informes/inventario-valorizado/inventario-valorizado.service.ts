import { Injectable } from '@angular/core';
import {
  InventarioInformeService,
  type InventarioInformeId,
} from '../shared/inventario-informe.service';
import type { InventarioValorizado } from './inventario-valorizado.model';

/**
 * Servicio HTTP del informe **Inventario valorizado**.
 *
 * Toda la mecánica —las dos acciones sobre `/inventario/informe/`, la
 * paginación, la forma de cada body— vive en `InventarioInformeService`; acá
 * solo se declara el discriminador.
 *
 * Es el informe `existencia` con las columnas de costo: mismo saldo consolidado
 * por ítem, más costo promedio y costo total.
 *
 * **Columnas sin confirmar**: el schema solo declara el serializer del informe
 * por defecto, así que la fila de este se mantiene como estaba hasta que backend
 * publique sus campos. Ver `PENDIENTES.md`.
 */
@Injectable({ providedIn: 'root' })
export class InventarioValorizadoService extends InventarioInformeService<InventarioValorizado> {
  protected readonly informe: InventarioInformeId = 'inventario_valorizado';
}
