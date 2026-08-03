/**
 * Metadata de las **17 banderas** de la programación: qué se liquida en el
 * periodo.
 *
 * Están declaradas como datos, no escritas a mano en la plantilla, por tres
 * razones: el formulario las renderiza en bucle (el ERP anterior gastaba 583
 * líneas de HTML en repetir el mismo bloque), la ficha las lista con el mismo
 * origen, y sumar una bandera es tocar este archivo y el tipo
 * `ProgramacionBanderas` — el resto compila solo.
 */
import type { ProgramacionBanderas } from './programacion.model';

/** Bloque en el que se agrupa la bandera en la UI. */
export type GrupoBandera = 'pagos' | 'descuentos' | 'prestaciones' | 'base';

export interface BanderaMeta {
  /** Nombre del campo, que es también el del control y el del payload. */
  readonly clave: keyof ProgramacionBanderas;
  readonly labelKey: string;
  readonly grupo: GrupoBandera;
}

/**
 * Las 17 banderas en el orden en que se muestran.
 *
 * El default de todas es `true` **salvo las dos de base de prestación**, que el
 * legacy inicializa en `false`. Ese default vive en el formulario, no acá: esto
 * es solo la descripción de los campos.
 */
export const PROGRAMACION_BANDERAS: readonly BanderaMeta[] = [
  // ── Pagos ──────────────────────────────────────────────────────────────────
  { clave: 'pago_horas', labelKey: 'entities.programacion.banderas.pagoHoras', grupo: 'pagos' },
  {
    clave: 'pago_auxilio_transporte',
    labelKey: 'entities.programacion.banderas.pagoAuxilioTransporte',
    grupo: 'pagos',
  },
  {
    clave: 'pago_incapacidad',
    labelKey: 'entities.programacion.banderas.pagoIncapacidad',
    grupo: 'pagos',
  },
  {
    clave: 'pago_licencia',
    labelKey: 'entities.programacion.banderas.pagoLicencia',
    grupo: 'pagos',
  },
  {
    clave: 'pago_vacacion',
    labelKey: 'entities.programacion.banderas.pagoVacacion',
    grupo: 'pagos',
  },
  { clave: 'adicional', labelKey: 'entities.programacion.banderas.adicional', grupo: 'pagos' },

  // ── Descuentos ─────────────────────────────────────────────────────────────
  {
    clave: 'descuento_salud',
    labelKey: 'entities.programacion.banderas.descuentoSalud',
    grupo: 'descuentos',
  },
  {
    clave: 'descuento_pension',
    labelKey: 'entities.programacion.banderas.descuentoPension',
    grupo: 'descuentos',
  },
  {
    clave: 'descuento_fondo_solidaridad',
    labelKey: 'entities.programacion.banderas.descuentoFondoSolidaridad',
    grupo: 'descuentos',
  },
  {
    clave: 'descuento_retencion_fuente',
    labelKey: 'entities.programacion.banderas.descuentoRetencionFuente',
    grupo: 'descuentos',
  },
  {
    clave: 'descuento_credito',
    labelKey: 'entities.programacion.banderas.descuentoCredito',
    grupo: 'descuentos',
  },
  {
    clave: 'descuento_embargo',
    labelKey: 'entities.programacion.banderas.descuentoEmbargo',
    grupo: 'descuentos',
  },

  // ── Prestaciones ───────────────────────────────────────────────────────────
  {
    clave: 'pago_prima',
    labelKey: 'entities.programacion.banderas.pagoPrima',
    grupo: 'prestaciones',
  },
  {
    clave: 'pago_cesantia',
    labelKey: 'entities.programacion.banderas.pagoCesantia',
    grupo: 'prestaciones',
  },
  {
    clave: 'pago_interes',
    labelKey: 'entities.programacion.banderas.pagoInteres',
    grupo: 'prestaciones',
  },

  // ── Base de prestación ─────────────────────────────────────────────────────
  {
    clave: 'base_prestacion_minimo',
    labelKey: 'entities.programacion.banderas.basePrestacionMinimo',
    grupo: 'base',
  },
  {
    clave: 'base_prestacion_minimo_salario',
    labelKey: 'entities.programacion.banderas.basePrestacionMinimoSalario',
    grupo: 'base',
  },
];

/** Orden de los bloques en la UI, con su clave i18n de título. */
export const GRUPOS_BANDERA: readonly {
  readonly grupo: GrupoBandera;
  readonly labelKey: string;
}[] = [
  { grupo: 'pagos', labelKey: 'entities.programacion.grupos.pagos' },
  { grupo: 'descuentos', labelKey: 'entities.programacion.grupos.descuentos' },
  { grupo: 'prestaciones', labelKey: 'entities.programacion.grupos.prestaciones' },
  { grupo: 'base', labelKey: 'entities.programacion.grupos.base' },
];

/** Banderas de un bloque, en el orden declarado. */
export function banderasDelGrupo(grupo: GrupoBandera): readonly BanderaMeta[] {
  return PROGRAMACION_BANDERAS.filter((bandera) => bandera.grupo === grupo);
}

/**
 * Defaults al crear: todo encendido salvo las dos de base de prestación, como
 * hace el ERP anterior.
 */
export function banderasPorDefecto(): ProgramacionBanderas {
  return {
    pago_horas: true,
    pago_auxilio_transporte: true,
    pago_incapacidad: true,
    pago_licencia: true,
    pago_vacacion: true,
    pago_prima: true,
    pago_cesantia: true,
    pago_interes: true,
    descuento_salud: true,
    descuento_pension: true,
    descuento_fondo_solidaridad: true,
    descuento_retencion_fuente: true,
    descuento_credito: true,
    descuento_embargo: true,
    adicional: true,
    base_prestacion_minimo: false,
    base_prestacion_minimo_salario: false,
  };
}
