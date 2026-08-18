export interface CentroCosto {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly estado_inactivo: boolean;
}

export interface CentroCostoPayload {
  codigo: string;
  nombre: string;
}
