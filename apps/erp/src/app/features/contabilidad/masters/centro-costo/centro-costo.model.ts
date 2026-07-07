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

/**
 * Respuesta del endpoint de importación masiva.
 * Shape provisional: crece cuando el backend defina su contrato final.
 */
export interface CentroCostoImportResult {
  readonly imported_count: number;
  readonly errors?: ReadonlyArray<{
    readonly row: number;
    readonly field?: string;
    readonly message: string;
  }>;
}
