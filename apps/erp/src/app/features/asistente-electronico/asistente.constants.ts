/**
 * Pasos del asistente de facturación electrónica.
 *
 * **Esta constante es la costura por donde crece el asistente.** Cuatro son los
 * del ERP anterior; «RedEDoc» es nuevo (el registro de la empresa como emisor,
 * que antes iba en un diálogo al guardar). «Habilitaciones» (el software ante
 * la DIAN) también. «Terminar» es el cierre: no guarda nada (la API nueva no
 * tiene `terminar-asistente/`), solo dice qué sigue. «Resolución» está
 * comentado hasta que se defina.
 *
 * Darle contenido a un paso = su rama en el `@switch` del asistente.
 */
export type AsistenteStepId =
  | 'empresa'
  | 'rededoc'
  | 'certificado'
  | 'habilitaciones'
  | 'resolucion'
  | 'finalizar';

export interface AsistenteStep {
  readonly id: AsistenteStepId;
  /** Clave i18n del rótulo que muestra el riel. */
  readonly labelKey: string;
  /** Clave i18n de la línea de apoyo: qué se pide en ese paso, en tres palabras. */
  readonly hintKey: string;
}

export const ASISTENTE_STEPS = [
  {
    id: 'empresa',
    labelKey: 'asistenteElectronico.asistente.pasos.empresa.label',
    hintKey: 'asistenteElectronico.asistente.pasos.empresa.hint',
  },
  {
    id: 'rededoc',
    labelKey: 'asistenteElectronico.asistente.pasos.rededoc.label',
    hintKey: 'asistenteElectronico.asistente.pasos.rededoc.hint',
  },
  {
    id: 'certificado',
    labelKey: 'asistenteElectronico.asistente.pasos.certificado.label',
    hintKey: 'asistenteElectronico.asistente.pasos.certificado.hint',
  },
  {
    id: 'habilitaciones',
    labelKey: 'asistenteElectronico.asistente.pasos.habilitaciones.label',
    hintKey: 'asistenteElectronico.asistente.pasos.habilitaciones.hint',
  },
  // «Resolución» queda fuera por ahora; vuelve cuando se defina su pantalla.
  // {
  //   id: 'resolucion',
  //   labelKey: 'asistenteElectronico.asistente.pasos.resolucion.label',
  //   hintKey: 'asistenteElectronico.asistente.pasos.resolucion.hint',
  // },
  {
    id: 'finalizar',
    labelKey: 'asistenteElectronico.asistente.pasos.finalizar.label',
    hintKey: 'asistenteElectronico.asistente.pasos.finalizar.hint',
  },
] as const satisfies readonly AsistenteStep[];
