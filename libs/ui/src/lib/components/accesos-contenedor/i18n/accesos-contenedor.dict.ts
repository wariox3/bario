import type { ContenedorAccesoId } from '@reddoc/core';

export interface AccesosContenedorDict {
  label: string;
  /** Atajo del encabezado, según lo que haga el click. */
  todos: string;
  ninguno: string;
  hint: string;
  /** `Record` sobre `ContenedorAccesoId`: sumar un acceso obliga a traducirlo. */
  flags: Record<ContenedorAccesoId, string>;
}

export interface AccesosContenedorTranslationsHost {
  accesosContenedor: AccesosContenedorDict;
}
