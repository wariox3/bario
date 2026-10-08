/**
 * Ciudad del catálogo global. `departamento_nombre` lo acompaña para desambiguar
 * los municipios homónimos — ver `formatCiudad`.
 */
export interface Ciudad {
  readonly id: number;
  readonly nombre: string;
  readonly departamento_nombre?: string | null;
}
