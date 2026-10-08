import { Injectable } from '@angular/core';
import {
  InventarioInformeService,
  type InventarioInformeId,
} from '../shared/inventario-informe.service';
import type { Existencia } from './existencia.model';

/**
 * Servicio HTTP del informe **Existencias**.
 *
 * Toda la mecánica —las dos acciones sobre `/inventario/informe/`, la
 * paginación, la forma de cada body— vive en `InventarioInformeService`; acá
 * solo se declara el discriminador.
 *
 * Es el informe por defecto del endpoint: una fila por ítem con el saldo
 * consolidado de todos los almacenes. Abrirlo por almacén es
 * `existencia_almacen`; con costos, `inventario_valorizado`.
 */
@Injectable({ providedIn: 'root' })
export class ExistenciaService extends InventarioInformeService<Existencia> {
  protected readonly informe: InventarioInformeId = 'existencia';
}
