import { buildContactoLabel, toFiniteNumber, type ErpSelectOption } from '@reddoc/core';

/**
 * Modelo y diff de **Corregir documento** —la corrección contable—. Módulo
 * puro: sin Angular ni HTTP, testeado en `corregir-documento.spec.ts`.
 *
 * El diálogo arranca con una copia de lo que trae el backend y al guardar manda
 * **solo lo que cambió** en un único `actualizar-contabilidad/`: la sede si
 * cambió y, en `detalles`, cada línea tocada con sus claves cambiadas. Lo que
 * viaja a la DIAN (número, resolución, fechas) lo corrige otro diálogo, el del
 * dropdown Electrónico. Comparar contra el original es lo
 * que evita reescribir líneas que nadie movió.
 */

/** Lo que el diálogo necesita del read de la cabecera (`general/documento/{id}/`). */
export interface CorregirCabeceraRead {
  readonly sede?: number | null;
  readonly sede_nombre?: string | null;
}

/** Lo que el diálogo necesita de cada línea (`general/documento-detalle/`). */
export interface CorregirLineaRead {
  readonly id: number;
  readonly tipo_registro?: string | null;
  readonly item_nombre?: string | null;
  readonly cuenta_codigo?: string | null;
  readonly cuenta_nombre?: string | null;
  readonly cantidad?: string | number | null;
  readonly precio?: string | number | null;
  readonly subtotal?: string | number | null;
  readonly base?: string | number | null;
  readonly centro_costo?: number | null;
  readonly centro_costo_nombre?: string | null;
  readonly contacto?: number | null;
  readonly contacto_nombre_corto?: string | null;
  readonly contacto_numero_identificacion?: string | null;
}

export interface CabeceraCorregible {
  readonly sede: ErpSelectOption | null;
}

export interface LineaCorregible {
  readonly id: number;
  /**
   * Línea de cuenta (`tipo_registro = 'C'`): la única con base y contacto
   * propios. Las de ítem los toman de la cabecera.
   */
  readonly esCuenta: boolean;
  /** Ítem o, en una línea de cuenta, código y nombre de la cuenta. */
  readonly descripcion: string;
  readonly cantidad: number | null;
  readonly precio: number | null;
  readonly subtotal: number | null;
  readonly centroCosto: ErpSelectOption | null;
  readonly base: number | null;
  readonly contacto: ErpSelectOption | null;
}

/** Cambios de cabecera: solo las claves que cambiaron. */
export interface CabeceraPatch {
  sede?: number | null;
}

/** Cambios de una línea: solo las claves que cambiaron. */
export interface LineaPatch {
  centro_costo?: number | null;
  base?: number | null;
  contacto?: number | null;
}

/** Cuerpo de `POST general/documento/actualizar-contabilidad/`. */
export interface ActualizarContabilidadPayload extends CabeceraPatch {
  readonly id: number;
  readonly detalles: readonly ({ readonly id: number } & LineaPatch)[];
}

/** Tipo de registro de una línea de cuenta en `documento-detalle`. */
const TIPO_REGISTRO_CUENTA = 'C';

/**
 * Opción con id y etiqueta. Si el backend no trae el id no hay valor, aunque
 * venga un nombre suelto.
 */
function opcion(id: number | null | undefined, nombre: string | null | undefined) {
  return id == null ? null : { id, nombre: nombre ?? '' };
}

export function aCabeceraCorregible(read: CorregirCabeceraRead): CabeceraCorregible {
  return { sede: opcion(read.sede, read.sede_nombre) };
}

export function aLineaCorregible(read: CorregirLineaRead): LineaCorregible {
  const esCuenta = read.tipo_registro === TIPO_REGISTRO_CUENTA;
  const cuenta = [read.cuenta_codigo, read.cuenta_nombre].filter(Boolean).join(' ');
  return {
    id: read.id,
    esCuenta,
    descripcion: (esCuenta ? cuenta : read.item_nombre) ?? '',
    cantidad: toFiniteNumber(read.cantidad),
    precio: toFiniteNumber(read.precio),
    subtotal: toFiniteNumber(read.subtotal),
    centroCosto: opcion(read.centro_costo, read.centro_costo_nombre),
    base: toFiniteNumber(read.base),
    contacto:
      read.contacto == null
        ? null
        : {
            id: read.contacto,
            nombre: buildContactoLabel(
              read.contacto_numero_identificacion,
              read.contacto_nombre_corto,
            ),
          },
  };
}

function mismoId(a: ErpSelectOption | null, b: ErpSelectOption | null): boolean {
  return (a?.id ?? null) === (b?.id ?? null);
}

/** Lo que cambió en la cabecera; `null` si nada. */
export function cambiosCabecera(
  original: CabeceraCorregible,
  actual: CabeceraCorregible,
): CabeceraPatch | null {
  const patch: CabeceraPatch = {};
  if (!mismoId(original.sede, actual.sede)) patch.sede = actual.sede?.id ?? null;
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Lo que cambió en una línea; `null` si nada. Base y contacto solo cuentan en
 * las líneas de cuenta: en las de ítem el diálogo no los ofrece.
 */
export function cambiosLinea(
  original: LineaCorregible,
  actual: LineaCorregible,
): LineaPatch | null {
  const patch: LineaPatch = {};
  if (!mismoId(original.centroCosto, actual.centroCosto)) {
    patch.centro_costo = actual.centroCosto?.id ?? null;
  }
  if (actual.esCuenta) {
    if (original.base !== actual.base) patch.base = actual.base;
    if (!mismoId(original.contacto, actual.contacto)) {
      patch.contacto = actual.contacto?.id ?? null;
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Arma el `actualizar-contabilidad/` con lo que cambió; `null` si nada. Las
 * líneas que no se tocaron no viajan.
 */
export function payloadContabilidad(
  id: number,
  original: {
    readonly cabecera: CabeceraCorregible;
    readonly lineas: ReadonlyMap<number, LineaCorregible>;
  },
  actual: { readonly cabecera: CabeceraCorregible; readonly lineas: readonly LineaCorregible[] },
): ActualizarContabilidadPayload | null {
  const cabecera = cambiosCabecera(original.cabecera, actual.cabecera);
  const detalles = actual.lineas.flatMap((linea) => {
    const antes = original.lineas.get(linea.id);
    const patch = antes ? cambiosLinea(antes, linea) : null;
    return patch ? [{ id: linea.id, ...patch }] : [];
  });
  if (!cabecera && detalles.length === 0) return null;
  return { id, ...cabecera, detalles };
}
