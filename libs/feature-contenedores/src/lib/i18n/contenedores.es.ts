import type { ContenedoresDict } from './contenedores.dict';

export const contenedoresEs: ContenedoresDict = {
  list: {
    title: 'Tus contenedores de empresa',
    subtitle: 'Seleccioná un espacio de trabajo para continuar',
    newButton: 'Nuevo contenedor',
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
  },
  create: {
    title: 'Nuevo contenedor',
    subtitle: 'Configurá el nuevo espacio de trabajo',
    fields: {
      name: 'Nombre del contenedor',
      namePlaceholder: 'Acme Corp',
      phone: 'Teléfono',
      phonePlaceholder: '3153334455',
      email: 'Correo electrónico',
      emailPlaceholder: 'contacto@empresa.com',
    },
    validation: {
      nameRequired: 'El nombre es obligatorio.',
      nameMin2: 'Mínimo 2 caracteres.',
      phoneRequired: 'El teléfono es obligatorio.',
      phoneMax20: 'Máximo 20 caracteres.',
      emailRequired: 'El correo es obligatorio.',
      emailInvalid: 'Ingresá un correo válido.',
    },
    submit: 'Crear contenedor',
    cancel: 'Cancelar',
    toasts: {
      success: { title: 'Contenedor creado', desc: 'El contenedor fue creado correctamente.' },
      error: {
        title: 'Error al crear',
        desc: 'No se pudo crear el contenedor. Intentá de nuevo.',
      },
    },
  },
  edit: {
    title: 'Editar contenedor',
    subtitle: 'Actualizá los datos del contenedor',
    submit: 'Guardar cambios',
    cancel: 'Cancelar',
    toasts: {
      success: { title: 'Empresa actualizada', desc: 'Los cambios se guardaron correctamente.' },
      error: {
        title: 'Error al actualizar',
        desc: 'No se pudo actualizar la empresa. Intentá de nuevo.',
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
        desc: 'No se pudo eliminar el contenedor. Intentá de nuevo.',
      },
    },
  },
  invite: {
    title: 'Invitar al contenedor',
    subtitle: 'Compartí este espacio con tu equipo por correo electrónico.',
    tabs: { members: 'Miembros', pending: 'Invitaciones' },
    form: {
      label: 'Correo del invitado',
      placeholder: 'nombre@empresa.com',
      invalid: 'Ingresá un correo válido.',
      submit: 'Enviar invitación',
      sending: 'Enviando…',
      grupos: {
        label: 'Grupos',
        placeholder: 'Seleccioná los grupos (opcional)',
        empty: 'No hay grupos disponibles.',
      },
    },
    pending: {
      estados: { P: 'Pendiente', A: 'Aceptada', R: 'Rechazada' },
      count: { one: 'invitación', other: 'invitaciones' },
      empty: {
        title: 'Sin invitaciones',
        sub: 'Las invitaciones que envíes aparecerán acá.',
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
        sub: 'Invitá a alguien por correo y aparecerá acá.',
      },
      you: 'tú',
      roles: {
        propietario: 'Propietario',
        administrador: 'Administrador',
        usuario: 'Miembro',
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
        desc: 'Intentá nuevamente en unos segundos.',
      },
      removed: {
        title: 'Miembro quitado',
        desc: 'Ya no tiene acceso al contenedor.',
      },
      removeError: {
        title: 'No se pudo quitar',
        desc: 'Intentá nuevamente en unos segundos.',
      },
      loadError: {
        title: 'Error al cargar miembros',
        desc: 'No pudimos traer la lista de miembros.',
      },
    },
  },
};
