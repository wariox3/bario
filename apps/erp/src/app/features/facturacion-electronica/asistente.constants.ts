/**
 * Pasos del asistente de facturación electrónica.
 *
 * **Esta constante es la costura por donde crece el asistente.** Cuatro son los
 * del ERP anterior; «RedEDoc» es nuevo (el registro de la empresa como emisor,
 * que antes iba en un diálogo al guardar). «Habilitaciones» (el software ante
 * la DIAN) también. Todos menos «Terminar» ya tienen contenido: de ese la API
 * nueva todavía no expone nada (`terminar-asistente/`), así que se declara para
 * tener el camino a la vista y su panel muestra un «próximamente». «Resolución»
 * está comentado hasta que se defina.
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
    labelKey: 'facturacionElectronica.asistente.pasos.empresa.label',
    hintKey: 'facturacionElectronica.asistente.pasos.empresa.hint',
  },
  {
    id: 'rededoc',
    labelKey: 'facturacionElectronica.asistente.pasos.rededoc.label',
    hintKey: 'facturacionElectronica.asistente.pasos.rededoc.hint',
  },
  {
    id: 'certificado',
    labelKey: 'facturacionElectronica.asistente.pasos.certificado.label',
    hintKey: 'facturacionElectronica.asistente.pasos.certificado.hint',
  },
  {
    id: 'habilitaciones',
    labelKey: 'facturacionElectronica.asistente.pasos.habilitaciones.label',
    hintKey: 'facturacionElectronica.asistente.pasos.habilitaciones.hint',
  },
  // «Resolución» queda fuera por ahora; vuelve cuando se defina su pantalla.
  // {
  //   id: 'resolucion',
  //   labelKey: 'facturacionElectronica.asistente.pasos.resolucion.label',
  //   hintKey: 'facturacionElectronica.asistente.pasos.resolucion.hint',
  // },
  {
    id: 'finalizar',
    labelKey: 'facturacionElectronica.asistente.pasos.finalizar.label',
    hintKey: 'facturacionElectronica.asistente.pasos.finalizar.hint',
  },
] as const satisfies readonly AsistenteStep[];
