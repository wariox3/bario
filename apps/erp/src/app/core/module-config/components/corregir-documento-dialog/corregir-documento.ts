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
  /** Exigencias de la cuenta de la línea: qué no puede quedar vacío. */
  readonly cuenta_exige_centro_costo?: boolean | null;
  readonly cuenta_exige_base?: boolean | null;
  readonly cuenta_exige_contacto?: boolean | null;
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
  /**
   * Lo que la cuenta de la línea exige (`cuenta_exige_*` del read). Si la
   * cuenta no lo exige, vaciar el campo es válido y viaja `null`.
   */
  readonly exige: CamposExigibles;
}

/** Campos de una línea que su cuenta puede exigir. */
export type CampoExigible = 'centroCosto' | 'base' | 'contacto';
export type CamposExigibles = Readonly<Record<CampoExigible, boolean>>;

/** Cambios de cabecera: solo las claves que cambiaron. */
export interface CabeceraPatch {
  sede?: number | null;
}

/** Cambio de una línea: solo las claves que cambiaron. */
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
    exige: {
      centroCosto: read.cuenta_exige_centro_costo === true,
      base: read.cuenta_exige_base === true,
      contacto: read.cuenta_exige_contacto === true,
    },
  };
}

/**
 * Base y contacto se corrigen solo en una línea de cuenta cuya cuenta los
 * exige: si no los exige, `actualizar-contabilidad/` los rechaza ("La cuenta
 * 130505 no exige base."). El centro de costo se corrige en cualquier línea;
 * su `exige` solo impide dejarlo vacío.
 */
export function corrigeCampo(linea: LineaCorregible, campo: 'base' | 'contacto'): boolean {
  return linea.esCuenta && linea.exige[campo];
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
 * Lo que cambió en una línea; `null` si nada. Base y contacto solo cuentan
 * donde se pueden corregir (`corrigeCampo`): en el resto el diálogo los
 * bloquea y mandarlos haría fallar toda la corrección.
 */
export function cambiosLinea(
  original: LineaCorregible,
  actual: LineaCorregible,
): LineaPatch | null {
  const cambioCentroCosto = !mismoId(original.centroCosto, actual.centroCosto);
  const cambioBase = corrigeCampo(actual, 'base') && original.base !== actual.base;
  const cambioContacto =
    corrigeCampo(actual, 'contacto') && !mismoId(original.contacto, actual.contacto);
  if (!cambioCentroCosto && !cambioBase && !cambioContacto) return null;
  return {
    ...(cambioCentroCosto ? { centro_costo: actual.centroCosto?.id ?? null } : {}),
    ...(cambioBase ? { base: actual.base } : {}),
    ...(cambioContacto ? { contacto: actual.contacto?.id ?? null } : {}),
  };
}

/** El campo que la cuenta exige quedó vacío (una base exigida va mayor a cero). */
function faltaExigido(linea: LineaCorregible, campo: CampoExigible): boolean {
  if (!linea.exige[campo]) return false;
  switch (campo) {
    case 'centroCosto':
      return linea.centroCosto == null;
    case 'base':
      return linea.esCuenta && (linea.base ?? 0) <= 0;
    case 'contacto':
      return linea.esCuenta && linea.contacto == null;
  }
}

const CAMPOS_EXIGIBLES: readonly CampoExigible[] = ['centroCosto', 'base', 'contacto'];

/**
 * Campos que su cuenta exige y quedaron vacíos, por id de línea; solo las
 * líneas con alguno. Cuenta también la línea que ya venía así: el diálogo
 * existe para corregir, así que no deja guardar mientras quede una
 * inconsistente. Base y contacto solo se exigen en las líneas de cuenta, las
 * únicas que los ofrecen.
 */
export function exigidosFaltantes(
  lineas: readonly LineaCorregible[],
): ReadonlyMap<number, ReadonlySet<CampoExigible>> {
  const faltantes = new Map<number, ReadonlySet<CampoExigible>>();
  for (const linea of lineas) {
    const campos = CAMPOS_EXIGIBLES.filter((campo) => faltaExigido(linea, campo));
    if (campos.length > 0) faltantes.set(linea.id, new Set(campos));
  }
  return faltantes;
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

/** Rechazo de `actualizar-contabilidad/`: el motivo general y el de cada línea. */
export interface RechazoCorreccion {
  readonly detail: string | null;
  /** Motivo por id de línea. */
  readonly porLinea: ReadonlyMap<number, string>;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

/**
 * Lee el 400 de `actualizar-contabilidad/` —
 * `{ detail, errores: [{ indice, id, mensaje }] }`— para marcar cada línea
 * rechazada. Si un error no trae `id`, se ubica por `indice` en los
 * `detalles` enviados. `null` si la respuesta no trae `errores`: el diálogo
 * cae al aviso genérico.
 */
export function rechazoCorreccion(
  err: unknown,
  enviados: readonly { readonly id: number }[],
): RechazoCorreccion | null {
  const body = esObjeto(err) && esObjeto(err['error']) ? err['error'] : null;
  const errores = body?.['errores'];
  if (!body || !Array.isArray(errores)) return null;
  const porLinea = new Map<number, string>();
  for (const error of errores) {
    if (!esObjeto(error) || typeof error['mensaje'] !== 'string') continue;
    const indice = error['indice'];
    const id =
      typeof error['id'] === 'number'
        ? error['id']
        : typeof indice === 'number'
          ? enviados[indice]?.id
          : undefined;
    if (id != null) porLinea.set(id, error['mensaje']);
  }
  const detail = typeof body['detail'] === 'string' ? body['detail'] : null;
  return { detail, porLinea };
}
