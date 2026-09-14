import { Injectable } from '@angular/core';
import {
  InventarioInformeService,
  type InventarioInformeId,
} from '../shared/inventario-informe.service';
import type { ExistenciaAlmacen } from './existencia-almacen.model';

/**
 * Servicio HTTP del informe **Existencias por almacén**.
 *
 * Toda la mecánica —las dos acciones sobre `/inventario/informe/`, la
 * paginación, la forma de cada body— vive en `InventarioInformeService`; acá
 * solo se declara el discriminador.
 *
 * Abre el saldo por almacén: una fila por ítem y almacén, sobre
 * `InvExistencia`. El consolidado por ítem es `existencia`.
 *
 * La fila quedó verificada contra la respuesta real: ver `ExistenciaAlmacen`.
 */
@Injectable({ providedIn: 'root' })
export class ExistenciaAlmacenService extends InventarioInformeService<ExistenciaAlmacen> {
  protected readonly informe: InventarioInformeId = 'existencia_almacen';
}
