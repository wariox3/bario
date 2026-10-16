/**
 * Acciones que una app habilita en la pantalla de contenedores.
 *
 * Cada app las pasa como `data` de su propia ruta de contenedores, no como
 * provider: importar un token desde este lib obligaría a `app.config.ts` a
 * hacerlo estáticamente y el chunk dejaría de ser lazy. El tipo se trae con
 * `import type`, que TypeScript borra al compilar.
 */
export interface ContenedoresCapabilities {
  /** Crear una empresa nueva. */
  readonly create: boolean;
  /** Editar nombre, teléfono y correo de la empresa. */
  readonly edit: boolean;
  /** Invitar miembros y gestionar los existentes. */
  readonly invite: boolean;
  /** Eliminar la empresa. */
  readonly delete: boolean;
  /** Salir de una empresa de la que se es miembro (no propietario). */
  readonly leave: boolean;
  /** Saltar a la app de cuenta para renovar o cambiar el plan. */
  readonly subscription: boolean;
  /** Alternar entre vista de lista y grilla. */
  readonly viewToggle: boolean;
  /**
   * Entrar como soporte a cualquier contenedor, sin invitación. Además de la
   * capability, el botón exige que el usuario sea staff (`is_staff` de `/me/`).
   */
  readonly support: boolean;
}

/** Todas las acciones habilitadas. Es el default del componente. */
export const CONTENEDORES_CAPABILITIES_FULL: ContenedoresCapabilities = {
  create: true,
  edit: true,
  invite: true,
  delete: true,
  leave: true,
  subscription: true,
  viewToggle: true,
  support: true,
};
