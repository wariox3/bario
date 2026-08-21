/**
 * Pasos del asistente de facturación electrónica.
 *
 * **Esta constante es la costura por donde crece el asistente.** Los cuatro son
 * los del ERP anterior, pero solo «Datos de la empresa» tiene contenido: de los
 * otros tres la API nueva todavía no expone nada (ni emisor, ni resolución del
 * asistente, ni `terminar-asistente/`), así que se declaran para tener el camino
 * a la vista y su panel muestra un «próximamente».
 *
 * Darle contenido a un paso = su rama en el `@switch` del asistente.
 */
export type AsistenteStepId = 'empresa' | 'emisor' | 'resolucion' | 'finalizar';

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
    id: 'emisor',
    labelKey: 'facturacionElectronica.asistente.pasos.emisor.label',
    hintKey: 'facturacionElectronica.asistente.pasos.emisor.hint',
  },
  {
    id: 'resolucion',
    labelKey: 'facturacionElectronica.asistente.pasos.resolucion.label',
    hintKey: 'facturacionElectronica.asistente.pasos.resolucion.hint',
  },
  {
    id: 'finalizar',
    labelKey: 'facturacionElectronica.asistente.pasos.finalizar.label',
    hintKey: 'facturacionElectronica.asistente.pasos.finalizar.hint',
  },
] as const satisfies readonly AsistenteStep[];
