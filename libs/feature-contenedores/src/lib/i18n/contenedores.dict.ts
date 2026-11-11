/**
 * Diccionario de la pantalla de contenedores. Vive en el lib (y no en el
 * `AppDict` de cada app) para que erp y turnos compartan una sola copia de los
 * textos, igual que `AuthDict` en `@reddoc/ui`.
 */
export interface ContenedoresDict {
  list: {
    title: string;
    subtitle: string;
    newButton: string;
    /** Botón del staff para entrar a un contenedor como soporte. */
    supportButton: string;
    searchPlaceholder: string;
    enter: string;
    status: { active: string; inactive: string };
    summary: {
      containers: { one: string; other: string };
      active: { one: string; other: string };
    };
    actions: {
      menuLabel: string;
      invite: string;
      edit: string;
      updateSubscription: string;
      transfer: string;
      delete: string;
      leave: string;
      /** «Salir» de una membresía de soporte. */
      closeSupport: string;
    };
    /** Confirmación de un miembro que sale de la empresa (`{nombre}`). */
    leave: {
      title: string;
      message: string;
      accept: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    /** Lo mismo que `leave`, para una membresía de soporte (`{nombre}`). */
    closeSupport: {
      title: string;
      message: string;
      accept: string;
      cancel: string;
      toasts: {
        success: { title: string; desc: string };
        error: { title: string; desc: string };
      };
    };
    view: {
      list: string;
      grid: string;
    };
    empty: {
      noResults: { title: string; sub: string };
      noContenedores: { title: string; sub: string; cta: string };
    };
    expired: {
      badge: string;
      ownerCta: string;
      memberLocked: string;
    };
    /** Badge de un contenedor que todavía no está `listo`: no se puede ingresar. */
    estado: {
      creando: string;
      error: string;
      /** CTA con el `paso` que reporta `/estado/`, tal cual llega (`{paso}`). */
      creandoPaso: string;
    };
    /** Avisos al terminar la creación en segundo plano; `{nombre}` es la empresa. */
    toasts: {
      ready: { title: string; desc: string };
      failed: { title: string; desc: string };
    };
    /** Antecede a la recencia: «Última conexión hace 3 horas». */
    lastConnection: string;
    /** Pill de la tarjeta/fila: una sola relación por empresa. */
    roles: {
      propietario: string;
      administrador: string;
      miembro: string;
      soporte: string;
    };
  };
  /** Invitaciones que recibió la persona, sobre el listado de empresas. */
  invitaciones: {
    /** Rótulo sobre el bloque; `{n}` es la cantidad. */
    eyebrow: { one: string; other: string };
    /** «{nombre} te invitó». */
    invitedBy: string;
    /** Quien invita, si no trae nombre ni correo. */
    someone: string;
    accept: string;
    reject: string;
    /** Rechazar se confirma en la misma fila. */
    confirmReject: string;
    confirmYes: string;
    confirmNo: string;
    /** `{n}` invitaciones plegadas. */
    more: { one: string; other: string };
    less: string;
    toasts: {
      acceptError: { title: string; desc: string };
      rejectError: { title: string; desc: string };
    };
  };
  /** Las dos cards al pie del inicio: enviar una idea y su trayecto. */
  ideas: {
    title: string;
    subtitle: string;
    placeholder: string;
    required: string;
    /** Ayuda bajo el campo: el atajo para enviar. */
    shortcut: string;
    submit: string;
    /** Acuse que reemplaza un rato la ayuda tras enviar. */
    sent: string;
    listTitle: string;
    etapas: { recibida: string; evaluacion: string; respondida: string; cerrada: string };
    empty: { title: string; sub: string };
    loadError: string;
    retry: string;
    toasts: { error: { title: string; desc: string } };
  };
  create: {
    title: string;
    subtitle: string;
    fields: {
      name: string;
      namePlaceholder: string;
      mobile: string;
      mobilePlaceholder: string;
      email: string;
      emailPlaceholder: string;
    };
    validation: {
      nameRequired: string;
      nameMin2: string;
      mobileRequired: string;
      mobilePattern: string;
      mobileLength: string;
      emailRequired: string;
      emailInvalid: string;
    };
    submit: string;
    cancel: string;
    toasts: {
      success: { title: string; desc: string };
      error: { title: string; desc: string };
    };
  };
  edit: {
    title: string;
    subtitle: string;
    submit: string;
    cancel: string;
    toasts: {
      success: { title: string; desc: string };
      error: { title: string; desc: string };
    };
    /** Imagen que identifica a la empresa: se guarda sola, aparte del formulario. */
    image: {
      title: string;
      description: string;
      upload: string;
      change: string;
      remove: string;
      hint: string;
      /** Rótulo del recuadro para lectores de pantalla (`{nombre}`). */
      tileLabel: string;
      uploading: string;
      errors: {
        type: string;
        size: string;
        upload: string;
        remove: string;
      };
    };
  };
  transfer: {
    title: string;
    subtitle: string;
    /** Lo que pasa al transferir; `{nombre}` es la empresa. */
    warning: string;
    memberLabel: string;
    memberPlaceholder: string;
    searchPlaceholder: string;
    /** Bajo el selector, cuando nadie puede recibir la propiedad. */
    empty: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    validation: { memberRequired: string; passwordRequired: string };
    /** Cuando el backend no manda `detail`. */
    genericError: string;
    loadError: string;
    retry: string;
    submit: string;
    cancel: string;
    /** `{nombre}` es el nuevo propietario. */
    success: { title: string; desc: string };
  };
  delete: {
    title: string;
    subtitle: string;
    warning: string;
    containerLabel: string;
    confirmLabel: string;
    confirmError: string;
    submit: string;
    cancel: string;
    toasts: {
      success: { title: string; desc: string };
      error: { title: string; desc: string };
    };
  };
  invite: {
    title: string;
    subtitle: string;
    tabs: { members: string; pending: string };
    form: {
      label: string;
      placeholder: string;
      invalid: string;
      submit: string;
      sending: string;
    };
    pending: {
      estados: { P: string; A: string; R: string };
      count: { one: string; other: string };
      empty: { title: string; sub: string };
      toasts: { loadError: { title: string; desc: string } };
    };
    members: {
      title: string;
      count: { one: string; other: string };
      empty: { title: string; sub: string };
      you: string;
      roles: {
        propietario: string;
        miembro: string;
      };
      removeAria: string;
    };
    remove: {
      title: string;
      desc: string;
      confirm: string;
      cancel: string;
    };
    close: string;
    toasts: {
      sent: { title: string; desc: string };
      sendError: { title: string; desc: string };
      removed: { title: string; desc: string };
      removeError: { title: string; desc: string };
      loadError: { title: string; desc: string };
    };
  };
  /** Modal del staff: entrar a cualquier contenedor como soporte, sin invitación. */
  support: {
    title: string;
    subtitle: string;
    field: string;
    placeholder: string;
    required: string;
    /** Sin MFA el backend responde 403: se avisa antes de intentarlo. */
    mfaRequired: string;
    /** Qué implica: miembro con todos los accesos, sin vencimiento. */
    note: string;
    submit: string;
    cancel: string;
    toasts: {
      success: { title: string; desc: string };
      error: { title: string; desc: string };
    };
  };
}

export interface ContenedoresTranslationsHost {
  contenedores: ContenedoresDict;
}
