export interface Programador {
  readonly id: number;
  readonly nombre: string;
  readonly estado_inactivo: boolean;
}

export interface ProgramadorPayload {
  nombre: string;
}
