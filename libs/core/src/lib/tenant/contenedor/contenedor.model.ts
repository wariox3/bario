import type { PaginatedResponse } from '../../models/pagination.model';

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

/**
 * Invitación a un contenedor tal como la devuelve el backend (`CtnInvitacion`),
 * en los dos listados: la que se envía (`pendiente-cliente/`) y la que se
 * recibe (`pendiente-usuario/`).
 *
 * `usuario*` es **quien invita**; del invitado solo llega su id
 * (`usuario_invitado`). `grupos_nombres` es con qué entrará al aceptar.
 */
export interface ContenedorInvitacion {
  readonly id: number;
  readonly cliente: number;
  readonly cliente_nombre: string;
  readonly usuario: number;
  readonly usuario_nombre_corto: string;
  readonly usuario_email: string;
  readonly usuario_invitado: number;
  readonly grupos: readonly number[];
  readonly grupos_nombres: readonly string[];
  readonly estado: ContenedorInvitacionEstado;
  readonly fecha: string;
}

/**
 * Invitación que envió un contenedor (`GET /contenedor/invitacion/pendiente-cliente/`).
 *
 * Al propietario le importa **a quién** invitó, y `CtnInvitacion` no trae el
 * nombre ni el correo del invitado: se pidieron al backend. Mientras no lleguen,
 * la fila los deja vacíos (no se resuelven con peticiones extra).
 */
export interface ContenedorInvitacionPendiente extends ContenedorInvitacion {
  readonly usuario_invitado_nombre_corto?: string | null;
  readonly usuario_invitado_email?: string | null;
}

export type ContenedorInvitacionesPendientesResponse =
  PaginatedResponse<ContenedorInvitacionPendiente>;

/** Invitación que recibió el usuario autenticado (`GET /contenedor/invitacion/pendiente-usuario/`). */
export type InvitacionRecibida = ContenedorInvitacion;

export type InvitacionesRecibidasResponse = PaginatedResponse<InvitacionRecibida>;

/**
 * Invitación a un contenedor (`POST /contenedor/invitacion/`,
 * `CtnInvitacionCrearRequest`).
 *
 * Además de a quién se invita, la invitación lleva **con qué entra**: sus
 * grupos de seguridad. Los accesos por módulo ya no viajan acá.
 */
export interface SendInviteRequest {
  cliente_id: number;
  usuario_id: number;
  /** Grupos de seguridad a los que pertenecerá el invitado al aceptar. */
  grupo_ids?: readonly number[];
}

/** Grupo de seguridad de `/seguridad/grupo/` (`{ id, nombre }`). */
export interface GrupoSeguridad {
  readonly id: number;
  readonly nombre: string;
}

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
 * (`?app=general&modelo=gencontacto&accion=view&search=…&page=`).
 * Todos opcionales y combinables.
 */
export interface PermisoCatalogoFiltros {
  readonly app?: string;
  readonly modelo?: string;
  readonly accion?: string;
  readonly search?: string;
  /** Página 1-based; sin ella el backend responde la primera (de a `LIST_PAGE_SIZE`). */
  readonly page?: number;
}

/**
 * Fila de `/seguridad/usuario-cliente-grupo/`: un grupo de una membresía.
 *
 * Vive en el schema público (sin `X-Tenant`) y se filtra por
 * `usuario_cliente_id`, el `id` de la membresía, no el del usuario. Quitar el
 * grupo es borrar la fila por su `id`.
 */
export interface UsuarioClienteGrupo {
  readonly id: number;
  /** `id` de la membresía (`usuario-cliente`). */
  readonly usuario_cliente: number;
  readonly grupo: number;
  readonly grupo_name: string | null;
  /** Con él, el miembro tiene todos los permisos del grupo; sin él, solo el menú. */
  readonly heredar_permisos?: boolean;
}

/**
 * Fila de `/seguridad/usuario-cliente-permiso/`: un permiso personalizado de
 * una membresía, con el permiso desglosado. Mismo esquema que los grupos: se
 * filtra por `usuario_cliente_id` y se quita borrando la fila por su `id`.
 *
 * No trae la etiqueta legible del modelo (`modelo_label` del catálogo): solo
 * `app_label` y `model` del content type.
 */
export interface UsuarioClientePermiso {
  readonly id: number;
  /** `id` de la membresía (`usuario-cliente`). */
  readonly usuario_cliente: number;
  readonly permiso: number;
  readonly permiso_codename: string | null;
  readonly permiso_name: string | null;
  readonly permiso_content_type_app_label: string | null;
  readonly permiso_content_type_model: string | null;
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
  /**
   * Id de la **membresía** (la fila usuario-cliente), no de la empresa: es el
   * que pide `DELETE /seguridad/usuario-cliente/{id}/` para salir de ella.
   */
  id: number;
  cliente_id: number;
  schema_name: string;
  cliente_nombre: string;
  activo: boolean;
  /** Solo se puede ingresar a un contenedor `listo`. */
  estado: ContenedorEstado;
  dominio: string;
  /**
   * Último ingreso a la empresa (ISO con hora y zona). El schema lo declara
   * requerido, pero se tolera vacío: sin dato, el listado no pinta la línea.
   */
  cliente_fecha_ultima_conexion?: string | null;
  /** Imagen que identifica a la empresa (WEBP, 1024px). Sin imagen, se pinta la inicial. */
  cliente_imagen?: string | null;
  /** Miniatura cuadrada (320×320) de `cliente_imagen`: la que va en tarjetas y filas. */
  cliente_imagen_thumbnail?: string | null;
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
  /**
   * ¿La membresía es de soporte? La abre el staff con
   * `POST /contenedor/cliente/{id}/soporte/`, sin invitación: entra con todos
   * los accesos aunque la suscripción esté vencida y la cierra él mismo saliendo
   * de la empresa. Opcional: un despliegue que no lo mande se lee como `false`.
   */
  soporte?: boolean;
  /** Superusuario de la plataforma: entra a todos los módulos. */
  readonly is_superuser?: boolean;
  /** Grupos de la membresía: deciden a qué módulos entra (ver `GRUPO_ACCESO`). */
  readonly grupos: readonly number[];
}

export type ContenedoresResponse = PaginatedResponse<Contenedor>;

/**
 * Membresía de quien consulta en un contenedor:
 * `GET /seguridad/usuario-cliente/usuario/?schema_name=<schema>` (serializer
 * `SegUsuarioCliente`, sin `X-Tenant`). Responde 404 si el contenedor no existe
 * o el usuario no es miembro.
 *
 * Es lo que valida la entrada a `/t/:slug` tras una recarga dura. No trae el
 * `schema_name` (es el que se mandó). `cliente_nombre` y
 * `cliente_imagen_thumbnail` se pidieron al backend: mientras no lleguen, el
 * header pinta el slug y la inicial.
 */
export interface MembresiaContenedor {
  /** Id de la membresía (la fila usuario-cliente), no del usuario. */
  readonly id: number;
  readonly usuario_id: number;
  readonly usuario_nombre_corto: string;
  readonly usuario_email: string;
  readonly cliente_id: number;
  /** El schema no lo marca requerido: ausente se lee como `false`. */
  readonly propietario?: boolean;
  readonly soporte: boolean;
  readonly is_superuser: boolean;
  /** Ids de los grupos de la membresía. */
  readonly grupos: readonly number[];
  readonly cliente_nombre?: string | null;
  readonly cliente_imagen_thumbnail?: string | null;
}

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
  /**
   * Imagen que identifica a la empresa en la interfaz (WEBP, 1024px), no el
   * logotipo de los formatos impresos. Se carga y se quita aparte del `PATCH`,
   * con `/contenedor/cliente/{id}/imagen/`.
   */
  readonly imagen: string | null;
  /** Miniatura cuadrada (320×320) de `imagen`. */
  readonly imagen_thumbnail: string | null;
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
