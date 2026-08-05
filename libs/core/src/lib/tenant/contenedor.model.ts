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

export interface SendInviteRequest {
  cliente_id: number;
  usuario_id: number;
  /**
   * Opcional: Seguridad del ERP invita sin rol (queda pendiente de definir si
   * el rol se manda en la invitación o se asigna después de aceptarla).
   */
  rol_id?: number;
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
 */
export interface ContenedorAccesoFlags {
  acceso_venta?: boolean;
  acceso_compra?: boolean;
  acceso_tesoreria?: boolean;
  acceso_cartera?: boolean;
  acceso_inventario?: boolean;
  acceso_humano?: boolean;
  acceso_contabilidad?: boolean;
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
