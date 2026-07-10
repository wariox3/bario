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
      delete: string;
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
  };
  create: {
    title: string;
    subtitle: string;
    fields: {
      name: string;
      namePlaceholder: string;
      phone: string;
      phonePlaceholder: string;
      email: string;
      emailPlaceholder: string;
    };
    validation: {
      nameRequired: string;
      nameMin2: string;
      phoneRequired: string;
      phoneMax20: string;
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
        administrador: string;
        usuario: string;
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
}

export interface ContenedoresTranslationsHost {
  contenedores: ContenedoresDict;
}
