import type { ContenedoresDict } from './contenedores.dict';

export const contenedoresEs: ContenedoresDict = {
  list: {
    title: 'Tus contenedores de empresa',
    subtitle: 'Selecciona un espacio de trabajo para continuar',
    newButton: 'Nuevo contenedor',
    supportButton: 'Acceso de soporte',
    searchPlaceholder: 'Buscar...',
    enter: 'Ingresar',
    status: { active: 'Activo', inactive: 'Inactivo' },
    summary: {
      containers: { one: 'contenedor', other: 'contenedores' },
      active: { one: 'activo', other: 'activos' },
    },
    actions: {
      menuLabel: 'Opciones del contenedor',
      invite: 'Invitar usuario',
      edit: 'Editar contenedor',
      updateSubscription: 'Actualizar suscripción',
      delete: 'Eliminar contenedor',
      leave: 'Salir de la empresa',
      closeSupport: 'Cerrar soporte',
    },
    leave: {
      title: 'Salir de {nombre}',
      message:
        'Dejarás de ver esta empresa y sus datos. Para volver, el propietario tendrá que invitarte de nuevo.',
      accept: 'Salir',
      cancel: 'Cancelar',
      toasts: {
        success: { title: 'Saliste de la empresa', desc: 'Ya no tienes acceso a {nombre}.' },
        error: { title: 'No se pudo salir', desc: 'Intenta de nuevo en un momento.' },
      },
    },
    closeSupport: {
      title: 'Cerrar soporte en {nombre}',
      message:
        'Dejarás de ver esta empresa. Puedes volver a abrir el acceso de soporte cuando lo necesites.',
      accept: 'Cerrar soporte',
      cancel: 'Cancelar',
      toasts: {
        success: { title: 'Soporte cerrado', desc: 'Ya no tienes acceso a {nombre}.' },
        error: { title: 'No se pudo cerrar', desc: 'Intenta de nuevo en un momento.' },
      },
    },
    view: {
      list: 'Vista de lista',
      grid: 'Vista de cuadrícula',
    },
    empty: {
      noResults: {
        title: 'Sin resultados',
        sub: 'No encontramos empresas que coincidan con tu búsqueda.',
      },
      noContenedores: {
        title: 'Sin empresas',
        sub: 'Aún no tenés ningún espacio de trabajo asignado.',
        cta: 'Crear primera empresa',
      },
    },
    expired: {
      badge: 'Vencida',
      ownerCta: 'Renovar suscripción',
      memberLocked: 'Solo el propietario puede renovar',
    },
    estado: {
      creando: 'Creando…',
      error: 'No se pudo crear',
      creandoPaso: 'Creando {paso}…',
    },
    toasts: {
      ready: { title: 'Contenedor listo', desc: '{nombre} ya está listo para ingresar.' },
      failed: {
        title: 'No se pudo crear el contenedor',
        desc: 'Algo falló al preparar {nombre}.',
      },
    },
    lastConnection: 'Última conexión',
    roles: {
      propietario: 'Propietario',
      miembro: 'Miembro',
      soporte: 'Soporte',
    },
  },
  create: {
    title: 'Nuevo contenedor',
    subtitle: 'Configura el nuevo espacio de trabajo',
    fields: {
      name: 'Nombre del contenedor',
      namePlaceholder: 'Acme Corp',
      mobile: 'Celular',
      mobilePlaceholder: '3153334455',
      email: 'Correo electrónico',
      emailPlaceholder: 'contacto@empresa.com',
    },
    validation: {
      nameRequired: 'El nombre es obligatorio.',
      nameMin2: 'Mínimo 2 caracteres.',
      mobileRequired: 'El celular es obligatorio.',
      mobilePattern: 'El número no es un celular válido.',
      mobileLength: 'El número no tiene el largo de un celular del país elegido.',
      emailRequired: 'El correo es obligatorio.',
      emailInvalid: 'Ingresa un correo válido.',
    },
    submit: 'Crear contenedor',
    cancel: 'Cancelar',
    toasts: {
      success: {
        title: 'Contenedor creado',
        desc: 'Lo estamos preparando; te avisamos cuando esté listo.',
      },
      error: {
        title: 'Error al crear',
        desc: 'No se pudo crear el contenedor. Intenta de nuevo.',
      },
    },
  },
  edit: {
    title: 'Editar contenedor',
    subtitle: 'Actualiza los datos del contenedor',
    submit: 'Guardar cambios',
    cancel: 'Cancelar',
    toasts: {
      success: { title: 'Empresa actualizada', desc: 'Los cambios se guardaron correctamente.' },
      error: {
        title: 'Error al actualizar',
        desc: 'No se pudo actualizar la empresa. Intenta de nuevo.',
      },
    },
    image: {
      title: 'Imagen de la empresa',
      description: 'Reemplaza la inicial en el listado de empresas.',
      upload: 'Subir imagen',
      change: 'Cambiar imagen',
      remove: 'Quitar',
      hint: 'JPG, PNG o WEBP, hasta 5 MB. Se guarda al elegirla.',
      tileLabel: 'Elegir imagen para {nombre}',
      uploading: 'Subiendo imagen…',
      errors: {
        type: 'El archivo no es una imagen JPG, PNG o WEBP.',
        size: 'La imagen pesa más de 5 MB.',
        upload: 'No se pudo subir la imagen. Intenta de nuevo.',
        remove: 'No se pudo quitar la imagen. Intenta de nuevo.',
      },
    },
  },
  delete: {
    title: 'Eliminar contenedor',
    subtitle: 'Esta acción es permanente y no se puede deshacer.',
    warning: 'Se eliminarán todos los datos asociados a este contenedor de forma irreversible.',
    containerLabel: 'Contenedor a eliminar',
    confirmLabel: 'Para confirmar, escribí el nombre exacto del contenedor',
    confirmError: 'El nombre no coincide.',
    submit: 'Eliminar',
    cancel: 'Cancelar',
    toasts: {
      success: {
        title: 'Contenedor eliminado',
        desc: 'El contenedor fue eliminado correctamente.',
      },
      error: {
        title: 'Error al eliminar',
        desc: 'No se pudo eliminar el contenedor. Intenta de nuevo.',
      },
    },
  },
  invite: {
    title: 'Invitar al contenedor',
    subtitle: 'Comparte este espacio con tu equipo por correo electrónico.',
    tabs: { members: 'Miembros', pending: 'Invitaciones' },
    form: {
      label: 'Correo del invitado',
      placeholder: 'nombre@empresa.com',
      invalid: 'Ingresa un correo válido.',
      submit: 'Enviar invitación',
      sending: 'Enviando…',
      grupos: {
        label: 'Grupos',
        placeholder: 'Selecciona los grupos (opcional)',
        empty: 'No hay grupos disponibles.',
      },
    },
    pending: {
      estados: { P: 'Pendiente', A: 'Aceptada', R: 'Rechazada' },
      count: { one: 'invitación', other: 'invitaciones' },
      empty: {
        title: 'Sin invitaciones',
        sub: 'Las invitaciones que envíes aparecerán aquí.',
      },
      toasts: {
        loadError: {
          title: 'Error al cargar invitaciones',
          desc: 'No pudimos traer las invitaciones pendientes.',
        },
      },
    },
    members: {
      title: 'Miembros',
      count: { one: 'miembro', other: 'miembros' },
      empty: {
        title: 'Aún nadie más',
        sub: 'Invita a alguien por correo y aparecerá aquí.',
      },
      you: 'tú',
      roles: {
        propietario: 'Propietario',
        miembro: 'Miembro',
      },
      removeAria: 'Quitar miembro',
    },
    remove: {
      title: 'Quitar miembro',
      desc: 'Perderá el acceso al contenedor. Esta acción no se puede deshacer.',
      confirm: 'Quitar',
      cancel: 'Cancelar',
    },
    close: 'Cerrar',
    toasts: {
      sent: {
        title: 'Invitación enviada',
        desc: 'Le enviamos un correo para sumarse al contenedor.',
      },
      sendError: {
        title: 'No se pudo invitar',
        desc: 'Intenta nuevamente en unos segundos.',
      },
      removed: {
        title: 'Miembro quitado',
        desc: 'Ya no tiene acceso al contenedor.',
      },
      removeError: {
        title: 'No se pudo quitar',
        desc: 'Intenta nuevamente en unos segundos.',
      },
      loadError: {
        title: 'Error al cargar miembros',
        desc: 'No pudimos traer la lista de miembros.',
      },
    },
  },
  support: {
    title: 'Acceso de soporte',
    subtitle: 'Agrega un contenedor a tu lista sin necesitar una invitación.',
    field: 'Contenedor',
    placeholder: 'Busca por nombre o schema',
    required: 'Selecciona un contenedor.',
    mfaRequired:
      'Para entrar como soporte necesitas la autenticación en varias fases activa en tu cuenta.',
    note: 'Entrarás como miembro con todos los accesos. El acceso no vence: se cierra saliendo de la empresa.',
    submit: 'Adicionar',
    cancel: 'Cancelar',
    toasts: {
      success: { title: 'Contenedor agregado', desc: '{nombre} ya está en tu lista.' },
      error: { title: 'No se pudo agregar', desc: 'Intenta de nuevo en un momento.' },
    },
  },
};
