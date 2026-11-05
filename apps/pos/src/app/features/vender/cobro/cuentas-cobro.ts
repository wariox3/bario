import { Injectable, computed, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import {
  BaseHttpService,
  CUENTA_BANCO_ENDPOINT,
  TenantService,
  fetchAllPages,
  type ErpSelectOption,
  type PaginatedResponse,
} from '@reddoc/core';
import { PosStorageService } from '../../../core/storage/pos-storage.service';
import { cuentaAdmiteMedio, type MedioPagoId, type MedioPagoPos } from './medios-pago';

/** Fila de `cuenta-banco/seleccionar/`. */
interface CuentaBancoFila {
  readonly id: number;
  readonly nombre: string;
  readonly cuenta_banco_tipo?: number | null;
}

/** Una cuenta donde puede entrar un cobro, con su tipo para saber de qué medio es. */
export interface CuentaCobro extends ErpSelectOption {
  readonly tipo: number | null;
}

/** Las cuentas a las que puede entrar el medio: caja para efectivo, banco para el resto. */
export function cuentasDelMedio(
  cuentas: readonly CuentaCobro[],
  medio: MedioPagoPos,
): CuentaCobro[] {
  return cuentas.filter((c) => cuentaAdmiteMedio(c.tipo, medio));
}

/**
 * La cuenta que el cobro propone: la única si hay una sola; si hay varias, la
 * última que usó esta caja con ese medio, mientras siga existiendo. Si no, nada:
 * la elige quien cobra.
 */
export function cuentaPropuesta(
  cuentas: readonly CuentaCobro[],
  recordadaId: number | null,
): CuentaCobro | null {
  if (cuentas.length === 1) return cuentas[0];
  return cuentas.find((c) => c.id === recordadaId) ?? null;
}

type CuentasRecordadas = Partial<Record<MedioPagoId, number>>;

function esCuentasRecordadas(valor: unknown): valor is CuentasRecordadas {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return false;
  return Object.values(valor).every((id) => typeof id === 'number');
}

/**
 * Las cuentas bancarias del tenant para el cobro, y la última que usó esta caja
 * con cada medio (en el navegador, como el resto de lo que es de la caja).
 *
 * `seleccionar/` no declara un filtro por `cuenta_banco_tipo`, pero cada fila lo
 * trae: se piden todas (una empresa tiene pocas) y se filtran aquí. Se piden
 * cada vez que se abre el cobro, para ver una cuenta recién creada en el ERP.
 */
@Injectable({ providedIn: 'root' })
export class CuentasCobroService extends BaseHttpService {
  private readonly tenant = inject(TenantService);
  private readonly storage = inject(PosStorageService);

  private readonly clave = computed(() => {
    const slug = this.tenant.currentSlug();
    return slug ? `pos:cuentas:${slug}` : null;
  });

  cuentas(): Observable<CuentaCobro[]> {
    return fetchAllPages((page) =>
      this.get<PaginatedResponse<CuentaBancoFila>>(CUENTA_BANCO_ENDPOINT, { page }),
    ).pipe(
      map((filas) =>
        filas.map((f) => ({ id: f.id, nombre: f.nombre, tipo: f.cuenta_banco_tipo ?? null })),
      ),
    );
  }

  recordada(medio: MedioPagoId): number | null {
    return this.leer()[medio] ?? null;
  }

  recordar(medio: MedioPagoId, cuentaId: number): void {
    const clave = this.clave();
    if (clave) this.storage.escribir(clave, { ...this.leer(), [medio]: cuentaId });
  }

  private leer(): CuentasRecordadas {
    const clave = this.clave();
    return (clave ? this.storage.leer(clave, esCuentasRecordadas) : null) ?? {};
  }
}
