import { PAISES_CELULAR, PaisCelular } from './paises-celular';

/**
 * Formato E.164: `+`, indicativo que nunca arranca en `0`, y entre 8 y 15
 * dígitos en total —el máximo que define la norma—. El largo por país lo
 * valida aparte el catálogo (`PaisCelular.longitudes`), cuando lo conoce.
 */
export const CELULAR_E164 = /^\+[1-9]\d{7,14}$/;

export interface CelularPartido {
  readonly pais: PaisCelular;
  /** Número nacional, solo dígitos, sin indicativo. */
  readonly nacional: string;
  /**
   * `false` cuando el valor traía `+` pero su indicativo no está en el
   * catálogo: `pais` es entonces el default y `nacional` conserva todos los
   * dígitos. Quien valide largos o normalice no debe fiarse de ese `pais`.
   */
  readonly enCatalogo: boolean;
}

function paisPorIso(iso: string): PaisCelular {
  return PAISES_CELULAR.find((p) => p.iso === iso) ?? PAISES_CELULAR[0];
}

/**
 * Quita el indicativo del país cuando venía pegado a un número sin `+`.
 *
 * Solo actúa si el largo total NO es ya un largo nacional válido —así un
 * nacional legítimo nunca se recorta— y lo que queda tras el indicativo sí lo
 * es. Si el país no declara `longitudes` no hay con qué decidir y se devuelve
 * intacto: preferimos un número sin partir a uno mutilado.
 */
function sinIndicativoPegado(digitos: string, pais: PaisCelular): string {
  const largos = pais.longitudes;
  if (!largos || largos.includes(digitos.length)) return digitos;
  if (!digitos.startsWith(pais.indicativo)) return digitos;
  const resto = digitos.slice(pais.indicativo.length);
  return largos.includes(resto.length) ? resto : digitos;
}

/**
 * Parte un celular almacenado en `pais + nacional` para poblar el selector.
 *
 * - Con `+`: matchea el indicativo **más largo** del catálogo (`+593` gana
 *   sobre `+59` inexistente; entre iguales gana el primero del catálogo — ver
 *   la nota de `+1` en `PAISES_CELULAR`). Si ningún indicativo matchea (país
 *   fuera del catálogo), cae al país por defecto con todos los dígitos como
 *   nacional: el dato no se pierde, solo queda mal atribuido hasta que la
 *   persona lo corrija.
 * - Sin `+` (dato legado, anterior a E.164): asume el país por defecto. Si los
 *   dígitos ya traían el indicativo pegado —`573001234567`, como quedaban los
 *   guardados sin normalizar— se separa igual: se detecta porque el largo total
 *   no es un largo nacional válido, pero sí lo es lo que queda tras el
 *   indicativo. Sin esa vuelta el número se duplicaría a `+57573001234567`.
 */
export function partirCelular(valor: string | null | undefined, defaultIso = 'CO'): CelularPartido {
  const porDefecto = paisPorIso(defaultIso);
  const crudo = (valor ?? '').trim();
  if (!crudo) return { pais: porDefecto, nacional: '', enCatalogo: true };

  const digitos = crudo.replace(/\D/g, '');
  if (!crudo.startsWith('+')) {
    return {
      pais: porDefecto,
      nacional: sinIndicativoPegado(digitos, porDefecto),
      enCatalogo: true,
    };
  }

  const pais = [...PAISES_CELULAR]
    .sort((a, b) => b.indicativo.length - a.indicativo.length)
    .find((p) => digitos.startsWith(p.indicativo));
  if (!pais) return { pais: porDefecto, nacional: digitos, enCatalogo: false };

  // Entre indicativos del mismo largo el sort es estable, pero el desempate
  // real (US/CA/DO en +1) debe seguir el orden del catálogo, no el del sort.
  const empatados = PAISES_CELULAR.filter((p) => p.indicativo === pais.indicativo);
  return {
    pais: empatados[0],
    nacional: digitos.slice(pais.indicativo.length),
    enCatalogo: true,
  };
}

/** Compone el E.164 (`+573153334455`), o `''` si no hay número nacional. */
export function componerCelular(pais: PaisCelular, nacional: string): string {
  const digitos = nacional.replace(/\D/g, '');
  return digitos ? `+${pais.indicativo}${digitos}` : '';
}

/**
 * Lleva un celular de origen dudoso (perfil del usuario, dato legado con
 * espacios o sin `+`) a E.164 canónico, o `''` si viene vacío. Para precargar
 * formularios cuyo control guarda E.164: así el campo no nace inválido.
 *
 * Un `+` de un país fuera del catálogo se respeta tal cual (solo se limpian
 * separadores): recomponerlo con el país default reescribiría el número.
 */
export function normalizarCelular(valor: string | null | undefined, defaultIso = 'CO'): string {
  const { pais, nacional, enCatalogo } = partirCelular(valor, defaultIso);
  if (!enCatalogo) return `+${(valor ?? '').replace(/\D/g, '')}`;
  return componerCelular(pais, nacional);
}

/**
 * Bandera emoji desde el ISO alfa-2 (regional indicator symbols). Sin assets;
 * donde el sistema no dibuja banderas (Windows) degrada a las letras `CO`,
 * que siguen siendo legibles.
 */
export function banderaEmoji(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
