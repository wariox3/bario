export interface GruposSeguridadDict {
  label: string;
  /** Atajo del encabezado, según lo que haga el click. */
  todos: string;
  ninguno: string;
  hint: string;
  loading: string;
  empty: string;
}

export interface GruposSeguridadTranslationsHost {
  gruposSeguridad: GruposSeguridadDict;
}
