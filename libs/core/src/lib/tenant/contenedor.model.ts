import type { PaginatedResponse } from '../models/pagination.model';

export type ContenedorRol = 'propietario' | 'administrador' | 'usuario';

export interface ContenedorMember {
  id: number;
  usuario_id: number;
  usuario_nombre_corto: string | null;
  usuario_email: string;
  cliente_id: number;
  rol_id: number | null;
  rol_nombre: string | null;
}

export type ContenedorMembersResponse = PaginatedResponse<ContenedorMember>;

export type ContenedorInvitacionEstado = 'P' | 'A' | 'R';

export interface ContenedorInvitacionPendiente {
  id: number;
  usuario_invitado: number;
  usuario_invitado_nombre_corto: string | null;
  usuario_invitado_correo: string;
  rol: number;
  rol_nombre: string;
  estado: ContenedorInvitacionEstado;
  fecha: string;
}

export type ContenedorInvitacionesPendientesResponse =
  PaginatedResponse<ContenedorInvitacionPendiente>;

/**
 * Invitación a un contenedor (`POST /contenedor/invitacion/`).
 *
 * Además de a quién se invita, la invitación lleva **con qué entra**: los
 * grupos de seguridad y las flags `acceso_*` de los módulos que va a poder
 * abrir. Son las mismas flags que describen el plan del contenedor
 * (`ContenedorAccesoFlags`), acá aplicadas a la persona.
 */
export interface SendInviteRequest extends ContenedorAccesoFlags {
  cliente_id: number;
  usuario_id: number;
  /**
   * Opcional: Seguridad del ERP invita **sin rol** — el rol se cambia desde la
   * fila del listado, no al invitar. Otras pantallas (contenedores) sí lo
   * mandan.
   */
  rol_id?: number;
  /** Grupos de seguridad a los que pertenecerá el invitado al aceptar. */
  grupo_ids?: readonly number[];
}

/**
 * Grupo de seguridad de `/seguridad/grupo/`.
 *
 * Shape confirmado por `/seguridad/usuario-cliente-permiso/` (`permiso.grupos`
 * llega como `{ id, nombre }`).
 */
export interface GrupoSeguridad {
  readonly id: number;
  readonly nombre: string;
}

/**
 * Permiso directo de un usuario (`permiso.permisos` de
 * `/seguridad/usuario-cliente-permiso/`). Confirmado: el backend manda el
 * mismo serializador del catálogo (`PermisoSeguridad`), etiquetas incluidas.
 */
export type PermisoAsignado = PermisoSeguridad;

/**
 * Permiso individual del catálogo `/seguridad/permiso/` (shape confirmado):
 * un permiso de Django por modelo y acción, con etiquetas listas para pintar.
 *
 * `accion` queda abierto a `string` porque además de las cuatro estándar
 * (`view`/`add`/`change`/`delete`) pueden existir permisos custom.
 */
export interface PermisoSeguridad {
  readonly id: number;
  readonly app: string;
  readonly modelo: string;
  readonly modelo_label: string;
  readonly accion: string;
  readonly codename: string;
  readonly nombre: string;
}

/**
 * Consulta de `/seguridad/permiso/` que el backend resuelve como query params
 * (`?app=general&modelo=gencontacto&accion=view&search=…&page=&limit=`).
 * Todos opcionales y combinables.
 */
export interface PermisoCatalogoFiltros {
  readonly app?: string;
  readonly modelo?: string;
  readonly accion?: string;
  readonly search?: string;
  /** Página 1-based; sin ella el backend responde la primera. */
  readonly page?: number;
  /** Tamaño de página; sin él aplica el default del backend (~25). */
  readonly limit?: number;
}

/** Bloque `permiso` de `/seguridad/usuario-cliente-permiso/`. */
export interface UsuarioPermiso {
  readonly id: number;
  readonly profile_id: number;
  readonly is_superuser: boolean;
  readonly is_staff: boolean;
  readonly grupos: readonly GrupoSeguridad[];
  readonly permisos: readonly PermisoAsignado[];
}

/** Fila de `/seguridad/usuario-cliente-permiso/`: membresía + permiso efectivo. */
export interface UsuarioClientePermiso {
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre_corto: string | null;
  readonly usuario_email: string;
  readonly rol_id: number;
  readonly rol_nombre: string;
  readonly permiso: UsuarioPermiso;
}

/**
 * Módulos que el contenedor tiene contratados, tal como los manda
 * `/contenedor/cliente/lista-usuario/`.
 *
 * Es el eje **plan del tenant**, no el del usuario: dicen qué módulos existen en
 * esta empresa, no qué puede hacer quien entra. Los tres ejes (plan, permisos
 * del usuario, rol de contenedor) se combinan en `PermissionsService` del ERP.
 *
 * Opcionales porque no todo consumidor del contenedor los necesita ni todo
 * backend los manda; quien decida con ellos debe distinguir "no vinieron" de
 * "vinieron en `false`". Ver `readModuleAccessFlags` en el ERP.
 *
 * `general` no tiene flag: es el módulo base, siempre disponible.
 *
 * `acceso_turno` no corresponde a un módulo del ERP sino a la app hermana de
 * turnos; viaja en la misma bolsa porque el contrato es del contenedor, no de
 * una app.
 */
export interface ContenedorAccesoFlags {
  acceso_venta?: boolean;
  acceso_compra?: boolean;
  acceso_tesoreria?: boolean;
  acceso_cartera?: boolean;
  acceso_inventario?: boolean;
  acceso_humano?: boolean;
  acceso_contabilidad?: boolean;
  acceso_turno?: boolean;
}

export interface Contenedor extends ContenedorAccesoFlags {
  cliente_id: number;
  schema_name: string;
  nombre: string;
  activo: boolean;
  dominio: string;
  telefono?: string;
  correo?: string;
  suscripcion_id?: number;
  suscripcion_fecha_fin?: string;
  suscripcion_frecuencia?: 'P' | 'M' | 'A';
  suscripcion_suscripcion_tipo_nombre?: string;
  rol_id: number;
  rol_nombre: string;
}

export type ContenedoresResponse = PaginatedResponse<Contenedor>;

export interface CreateContenedorRequest {
  nombre: string;
  schema_name: string;
  telefono: string;
  correo: string;
  suscripcion_tipo_id: number;
  frecuencia: string;
}

export interface UserSearchResult {
  readonly id: number;
  readonly nombre_corto: string | null;
  readonly email: string;
}
