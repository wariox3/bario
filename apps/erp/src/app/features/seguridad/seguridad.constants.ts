import type { ColumnDef } from '@reddoc/core';
import { CONTENEDOR_ROL } from '@erp/core/permissions';

/** Clave i18n del rol por id, para cuando el backend no manda `rol_nombre`. */
export const ROL_LABEL_KEY_BY_ID: Readonly<
  Record<number, 'propietario' | 'administrador' | 'usuario'>
> = {
  [CONTENEDOR_ROL.propietario]: 'propietario',
  [CONTENEDOR_ROL.administrador]: 'administrador',
  [CONTENEDOR_ROL.usuario]: 'usuario',
};

export const SEGURIDAD_USUARIOS_COLUMNS: readonly ColumnDef[] = [
  {
    field: 'usuario_nombre_corto',
    headerKey: 'seguridad.usuarios.columns.nombre',
    type: 'text',
  },
  { field: 'usuario_email', headerKey: 'seguridad.usuarios.columns.correo', type: 'text' },
  {
    field: 'rol_nombre',
    headerKey: 'seguridad.usuarios.columns.rol',
    type: 'text',
    width: '200px',
  },
];
