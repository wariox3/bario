import type { PaginatedResponse } from '../models/pagination.model';

/**
 * Miembro del contenedor (`/seguridad/usuario-cliente/lista-cliente/`).
 *
 * El miembro **no tiene rol**: desde 2026-08-07 el backend cambió `rol_id`/
 * `rol_nombre` por la bandera `propietario` y sumó las flags `acceso_*` de esa
 * persona, que son las mismas que se otorgan al invitar (`SendInviteRequest`).
 */
export interface ContenedorMember extends ContenedorAccesoFlags {
  id: number;
  usuario_id: number;
  usuario_nombre_corto: string | null;
  usuario_email: string;
  cliente_id: number;
  propietario: boolean;
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
  /** Como en `ContenedorMember`: el rol se fue, quedó la bandera. */
  readonly propietario: boolean;
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

/**
 * Ciclo de vida del contenedor. El `POST` lo deja en `creando` y responde 202:
 * el schema, las migraciones y los catálogos los termina una tarea en segundo
 * plano. Mientras no esté `listo`, toda petición con su `X-Tenant` responde 409.
 */
export type ContenedorEstado = 'creando' | 'listo' | 'error';

/** `GET /contenedor/cliente/{id}/estado/`: lo que se consulta mientras se crea. */
export interface ContenedorEstadoResponse {
  readonly estado: ContenedorEstado;
  /**
   * En qué va la creación (`esquema`, `migraciones`, `permisos`, `catalogos`).
   * Solo en `creando`, y aun así puede faltar: el backend lo lee de caché.
   */
  readonly paso: string | null;
}

/**
 * Una empresa del usuario, tal como la lista `/contenedor/cliente/lista-usuario/`
 * (serializer `CtnClienteListaUsuario`).
 *
 * La fila **no es el cliente**: es la membresía del usuario en él, con el FK
 * aplanado. Por eso el id y el nombre llegan con el prefijo del FK
 * (`cliente_id`, `cliente_nombre`) y no como `id`/`nombre`, que es lo que
 * devuelve la ficha (`ContenedorDetalle`). Los datos de contacto de la empresa
 * —`celular`, `correo`— **no viajan acá**: solo en la ficha.
 */
export interface Contenedor extends ContenedorAccesoFlags {
  cliente_id: number;
  schema_name: string;
  cliente_nombre: string;
  activo: boolean;
  /** Solo se puede ingresar a un contenedor `listo`. */
  estado: ContenedorEstado;
  dominio: string;
  suscripcion_id?: number;
  suscripcion_fecha_fin?: string;
  suscripcion_frecuencia?: 'P' | 'M' | 'A';
  suscripcion_suscripcion_tipo_nombre?: string;
  /**
   * ¿El usuario es el propietario de esta empresa?
   *
   * Reemplaza al par `rol_id`/`rol_nombre` que mandaba antes
   * `/contenedor/cliente/lista-usuario/`: a nivel contenedor la única distinción
   * que hace el backend es propietario o no. Los tres roles (propietario /
   * administrador / usuario) siguen existiendo pero **por membresía**, en
   * `ContenedorMember.rol_id`, que es otro endpoint.
   */
  propietario: boolean;
}

export type ContenedoresResponse = PaginatedResponse<Contenedor>;

/**
 * Ficha de una empresa (`GET /contenedor/cliente/{id}/`, serializer
 * `CtnCliente`). Es el shape que alimenta el formulario de edición.
 *
 * Otro serializer que el de la lista, no un supraconjunto: acá el cliente es el
 * recurso, así que el id es `id` y el nombre `nombre` —sin el prefijo del FK—,
 * están `celular` y `correo`, y **no** vienen `dominio`, `propietario`, las
 * flags `acceso_*` ni la suscripción.
 */
export interface ContenedorDetalle {
  readonly id: number;
  readonly schema_name: string;
  readonly nombre: string;
  readonly celular: string;
  readonly correo: string;
  readonly activo: boolean;
  readonly estado: ContenedorEstado;
  /** Alta de la empresa, `yyyy-MM-ddTHH:mm:ss`. */
  readonly fecha_creacion: string | null;
}

export interface CreateContenedorRequest {
  nombre: string;
  schema_name: string;
  celular: string;
  correo: string;
}

export interface UserSearchResult {
  readonly id: number;
  readonly nombre_corto: string | null;
  readonly email: string;
}
