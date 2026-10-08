import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { DatePicker } from 'primeng/datepicker';

/** Un tramo de dígitos del formato (`dd`, `mm`, `yy`) y lo que lo cierra. */
interface Tramo {
  readonly largo: number;
  /** Mayor primer dígito que admite: un `4` en el día solo puede ser `04`. */
  readonly primerDigitoMax: number;
  /** Mayor valor del tramo completo (31 el día, 12 el mes); `null` en el año. */
  readonly max: number | null;
  /** Separador que va después del tramo; vacío en el último. */
  readonly separador: string;
}

function esDigito(caracter: string | undefined): boolean {
  return caracter !== undefined && /^\d$/.test(caracter);
}

/** Lo que puede separar dos tramos: ni dígito ni letra (`/`, `-`, `.`, un espacio). */
function esSeparador(caracter: string | undefined): boolean {
  return caracter !== undefined && !/[\p{L}\p{N}]/u.test(caracter);
}

/**
 * Formato PrimeNG → tramos. `null` si el formato trae algo que no se teclea
 * como dígitos (nombres de mes o de día, `@`, `!`) o un separador de más de un
 * carácter (`dd - mm`): ahí no hay máscara posible.
 */
export function tramosDelFormato(formato: string): readonly Tramo[] | null {
  const partes = formato.match(/d+|m+|y+|[^dmy]+/g) ?? [];
  const tramos: Tramo[] = [];
  for (const parte of partes) {
    if (/^(dd?|mm?|yy?)$/.test(parte)) {
      const letra = parte[0];
      tramos.push({
        // `yy` es el año de 4 dígitos en la notación de PrimeNG; `y`, el de 2.
        largo: letra === 'y' ? (parte === 'yy' ? 4 : 2) : 2,
        primerDigitoMax: letra === 'd' ? 3 : letra === 'm' ? 1 : 9,
        max: letra === 'd' ? 31 : letra === 'm' ? 12 : null,
        separador: '',
      });
    } else if (/^[^\p{L}\p{N}@!']$/u.test(parte) && tramos.length > 0) {
      const ultimo = tramos[tramos.length - 1];
      tramos[tramos.length - 1] = { ...ultimo, separador: parte };
    } else {
      return null;
    }
  }
  return tramos.length > 0 ? tramos : null;
}

/**
 * Si un tramo ya completo cae fuera de rango: un día 35, un mes 13 o un `00`. El
 * tope es el del mes más largo; un 31 de abril pasa la máscara y lo rechaza
 * PrimeNG al parsear.
 */
function fueraDeRango(digitos: string, tramo: Tramo): boolean {
  if (tramo.max === null || digitos.length < tramo.largo) return false;
  const n = Number(digitos);
  return n === 0 || n > tramo.max;
}

/**
 * Dígitos con los que **arranca** un tramo: un primer dígito que no puede ser
 * decena del tramo se completa con cero (`4` en el día → `04`).
 */
function arrancarTramo(digito: string, tramo: Tramo): string {
  return tramo.largo === 2 && Number(digito) > tramo.primerDigitoMax ? `0${digito}` : digito;
}

/**
 * Si el texto tiene la forma que arma la máscara: un grupo de dígitos por
 * tramo, ninguno más largo que el suyo. Deja de tenerla cuando se borra un
 * separador (`3112/2026`) o un tramo entero (`31/2026`).
 */
function bienArmado(texto: string, tramos: readonly Tramo[]): boolean {
  const grupos = texto.split(/\D/);
  return (
    grupos.length <= tramos.length && grupos.every((grupo, i) => grupo.length <= tramos[i].largo)
  );
}

/** Un texto rearmado sobre los tramos. */
interface Rearmado {
  readonly texto: string;
  /**
   * Si cada dígito quedó donde venía. Deja de ser fiel cuando rearmar obligó a
   * descartar un dígito o a partir un número entre dos tramos: señal de que el
   * texto no venía en este formato.
   */
  readonly fiel: boolean;
}

function rearmar(crudo: string, tramos: readonly Tramo[]): Rearmado {
  const caracteres = [...crudo];
  let salida = '';
  let indice = 0;
  let actual = '';
  let fiel = true;
  // Un separador que no pudo cerrar el tramo (un año a medias, un `0`): lo que
  // siga era otro número, no el resto de este.
  let cortado = false;

  const cerrarTramo = (): void => {
    const tramo = tramos[indice];
    salida += actual.padStart(tramo.largo, '0') + tramo.separador;
    indice++;
    actual = '';
    cortado = false;
  };

  for (const [posicion, caracter] of caracteres.entries()) {
    if (indice >= tramos.length) {
      // Fecha completa. Dígitos pegados a ella sobran; tras un separador viene
      // otra cosa (una hora), que se ignora.
      if (esDigito(caracter)) fiel = false;
      break;
    }
    const tramo = tramos[indice];

    if (esDigito(caracter)) {
      const arranca = actual === '';
      const candidato = arranca ? arrancarTramo(caracter, tramo) : actual + caracter;
      if (fueraDeRango(candidato, tramo)) {
        fiel = false;
        continue;
      }
      // Rellenar con cero un dígito al que le sigue otro parte un número en
      // dos: el `31` de `12/31/2026` quedaría `03` y el `1` pasaría al año.
      const partido = arranca && candidato.length > 1 && esDigito(caracteres[posicion + 1]);
      if (partido || cortado) fiel = false;
      actual = candidato;
      if (actual.length === tramo.largo) cerrarTramo();
    } else if (esSeparador(caracter) && actual !== '') {
      if (tramo.largo === 2 && Number(actual) > 0) cerrarTramo();
      else cortado = true;
    }
  }
  return { texto: salida + actual, fiel };
}

/**
 * Rearma lo **tecleado** sobre los tramos.
 *
 * - Un tramo completo cierra con su separador: `3112` → `31/12/`.
 * - Un separador tecleado a mitad de tramo lo completa con cero: `3/` → `03/`.
 *   Vale cualquiera, no solo el del formato: `1-2-2026` y `1.2.2026` quedan
 *   `01/02/2026`.
 * - Un primer dígito que no puede ser decena del tramo lo rellena: `4` → `04/`.
 * - Un dígito que dejaría el tramo fuera de rango se descarta: `35` → `3`.
 */
export function aplicarMascara(crudo: string, tramos: readonly Tramo[]): string {
  return rearmar(crudo, tramos).texto;
}

/**
 * Rearma un texto que llegó **de golpe** (pegado, arrastrado, autocompletado).
 * A diferencia de lo tecleado, no se ve entrar dígito a dígito, así que solo se
 * enmascara si encaja sin perder ni mover dígitos. Forzarlo convertiría una
 * fecha en otro orden en una fecha válida y equivocada: `2026-12-31` quedaría
 * `20/02/6123`.
 *
 * `null` cuando no encaja: el texto se deja como llegó y PrimeNG lo rechaza.
 */
export function enmascararPegado(crudo: string, tramos: readonly Tramo[]): string | null {
  const { texto, fiel } = rearmar(crudo, tramos);
  return fiel ? texto : null;
}

/** Texto y cursor después de una tecla resuelta por la máscara. */
export interface EdicionFecha {
  readonly valor: string;
  readonly cursor: number;
}

/**
 * Una tecla con el cursor **en medio** de una fecha ya armada. Cada tramo tiene
 * tope, como en un `<input type="date">` nativo:
 *
 * - Teclear al **inicio** de un tramo lo empieza de nuevo: `19/10` con el cursor
 *   delante y un `3` → `3/10`, listo para el `1` de `31`. Pisar solo el primer
 *   dígito dejaría un `39` imposible. Un primer dígito que no puede ser decena
 *   se completa con cero y cruza al tramo siguiente: `4` → `04/`.
 * - **Dentro** de un tramo, el dígito se inserta si hay lugar y pisa el que está
 *   bajo el cursor si no. Si el tramo está lleno y el cursor al final, la tecla
 *   salta al tramo siguiente: `31/10` nunca llega a `311/10`. Salvo que lo
 *   siguiente sea un año ya escrito: una tecla de más no se lo lleva.
 * - Un dígito que dejaría el tramo fuera de rango (`35`, `13`, `00`) no entra.
 * - Al llenar un tramo, el cursor pasa solo el separador.
 * - Un separador tecleado justo antes de otro solo lo cruza. Cualquier otra
 *   tecla que no sea un dígito no entra.
 *
 * Una tecla que no entra devuelve el mismo `valor` con el cursor en `inicio`.
 *
 * `null` cuando el texto no tiene la forma que arma la máscara (se borró un
 * separador o un tramo): ahí la tecla entra tal cual, para que la corrección
 * no se trabe.
 */
export function editarEnMedio(
  valor: string,
  inicio: number,
  fin: number,
  tecla: string,
  tramos: readonly Tramo[],
): EdicionFecha | null {
  const rechazo: EdicionFecha = { valor, cursor: inicio };

  if (!esDigito(tecla)) {
    if (!bienArmado(valor, tramos)) return null;
    const cruza = esSeparador(tecla) && inicio === fin && /\D/.test(valor.charAt(inicio));
    return cruza ? { valor, cursor: inicio + 1 } : rechazo;
  }

  // Lo seleccionado se va primero, como en cualquier input.
  let texto = valor.slice(0, inicio) + valor.slice(fin);
  if (!bienArmado(texto, tramos)) return null;
  let cursor = inicio;

  /** Tramo que contiene `pos`: su índice en el formato y sus bordes en el texto. */
  const tramoEn = (pos: number): { indice: number; desde: number; hasta: number } => {
    const antes = texto.slice(0, pos);
    const indice = antes.replace(/\d/g, '').length;
    const desde = antes.search(/\d*$/);
    const resto = texto.slice(pos).search(/\D/);
    return { indice, desde, hasta: resto === -1 ? texto.length : pos + resto };
  };

  let actual = tramoEn(cursor);
  let tramo = tramos[actual.indice];

  if (actual.hasta - actual.desde >= tramo.largo && cursor === actual.hasta) {
    // Tramo lleno con el cursor al final: lo que sigue es del próximo tramo.
    if (cursor === texto.length) return null;
    cursor++;
    actual = tramoEn(cursor);
    tramo = tramos[actual.indice];
    // Empezar de nuevo un año ya escrito por una tecla de más borraría cuatro
    // dígitos de un golpe y dejaría la fecha inválida.
    if (tramo.max === null && actual.hasta > actual.desde) return rechazo;
  }

  let digitos: string;
  let cursorEnTramo: number;
  const previos = texto.slice(actual.desde, actual.hasta);
  if (cursor === actual.desde) {
    digitos = arrancarTramo(tecla, tramo);
    cursorEnTramo = digitos.length;
  } else {
    const offset = cursor - actual.desde;
    const lleno = previos.length >= tramo.largo;
    digitos = previos.slice(0, offset) + tecla + previos.slice(lleno ? offset + 1 : offset);
    cursorEnTramo = offset + 1;
  }
  if (fueraDeRango(digitos, tramo)) return rechazo;

  texto = texto.slice(0, actual.desde) + digitos + texto.slice(actual.hasta);
  cursor = actual.desde + cursorEnTramo;

  const completo = digitos.length >= tramo.largo;
  if (completo && cursor === actual.desde + digitos.length && cursor < texto.length) {
    cursor++;
  }
  return { valor: texto, cursor };
}

/**
 * Un retroceso o un suprimir que se llevaría un separador **en medio** del
 * texto. El separador se queda y el cursor lo salta: borrarlo pegaría dos
 * tramos (`3112/2026`) y la fecha dejaría de leerse.
 *
 * Devuelve dónde queda el cursor, o `null` si el borrado sigue su curso: lo que
 * se borra es un dígito, o el separador que cierra el texto (`31/12/`), que sí
 * se va para poder corregir lo recién tecleado.
 */
export function saltarSeparadorAlBorrar(
  valor: string,
  cursor: number,
  haciaAtras: boolean,
  tramos: readonly Tramo[],
): number | null {
  if (!bienArmado(valor, tramos)) return null;
  const borrado = haciaAtras ? cursor - 1 : cursor;
  if (borrado < 0 || borrado >= valor.length - 1) return null;
  if (esDigito(valor[borrado])) return null;
  return haciaAtras ? borrado : borrado + 1;
}

/**
 * Máscara de tecleo para `<p-datepicker>`: los separadores del formato aparecen
 * solos mientras se escriben los dígitos. `31122026` queda `31/12/2026` sin
 * tocar la tecla `/`, y quien sí la teclea no la duplica.
 *
 * PrimeNG no trae máscara para el datepicker: su `onUserInput` intenta parsear
 * el texto tal cual en cada tecla, así que sin separadores nunca llega a una
 * fecha. La directiva reescribe el `<input>` **antes** de que PrimeNG lo lea
 * (listener en fase de captura sobre el host, que corre antes que el `(input)`
 * del input interno), y PrimeNG parsea el texto ya enmascarado.
 *
 * Toma el formato del propio datepicker (`getDateFormat()`), así que sirve para
 * el `dd/mm/yy` global y para los `mm/yy` de selección de mes. Se aparta en los
 * casos donde enmascarar estorbaría: rango o múltiple, con hora, o un formato
 * con nombres de mes.
 *
 * El selector es el propio elemento para que ningún datepicker tenga que
 * pedirla, pero **cada componente que use `<p-datepicker>` debe sumarla a sus
 * `imports`**: sin eso el calendario queda sin máscara y nada avisa.
 *
 * Tres momentos, tres reglas:
 *
 * - **Tecleando al final** (fecha nueva): se deja entrar el texto y se rearma
 *   entero con `aplicarMascara` en el `input`.
 * - **Pegando**: igual, pero con `enmascararPegado`, que solo rearma si el
 *   texto encaja en el formato. Una fecha en otro orden se deja como llegó.
 * - **Corrigiendo en medio** (cambiar el día de `01/10/2026`): se resuelve la
 *   tecla en el `beforeinput`, antes de que entre, con `editarEnMedio` —tope
 *   por tramo, el dígito sobrante pasa al tramo siguiente—. Rearmar todo ahí
 *   leería el separador que sigue al dígito como "tramo cerrado" y rellenaría
 *   con ceros (`3/10` → `03/10`). Como la tecla se cancela, se dispara un
 *   `input` propio para que PrimeNG parsee el texto nuevo; su `onUserInput`
 *   lo acepta porque el `keydown` de esa misma tecla ya pasó.
 *
 * Al borrar no se rearma nada: el retroceso no pelea con un separador que
 * reaparece. Lo único que se cuida es que no se lleve un separador de en medio
 * (`saltarSeparadorAlBorrar`).
 */
@Directive({
  // Va sobre el elemento de PrimeNG, sin atributo propio: la máscara es de todo
  // datepicker, no una opción que cada uno pida. Por eso `eslint.config.mjs` le
  // apaga `directive-selector`.
  selector: 'p-datepicker, p-datePicker, p-date-picker',
  standalone: true,
})
export class MascaraFechaDirective {
  private readonly datePicker = inject(DatePicker, { self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    // Fase de captura en el host: corre antes que los listeners de PrimeNG
    // sobre el input interno.
    const antes = (event: Event): void => this.onBeforeInput(event);
    const despues = (event: Event): void => this.onInput(event);
    this.host.addEventListener('beforeinput', antes, { capture: true });
    this.host.addEventListener('input', despues, { capture: true });
    inject(DestroyRef).onDestroy(() => {
      this.host.removeEventListener('beforeinput', antes, { capture: true });
      this.host.removeEventListener('input', despues, { capture: true });
    });
  }

  /** Tramos del formato de este datepicker, o `null` si no lleva máscara. */
  private tramos(): readonly Tramo[] | null {
    const dp = this.datePicker;
    if (dp.selectionMode !== 'single' || dp.showTime || dp.timeOnly) return null;
    return tramosDelFormato(dp.getDateFormat());
  }

  private onBeforeInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !(event instanceof InputEvent)) return;

    const inicio = input.selectionStart ?? input.value.length;
    const fin = input.selectionEnd ?? inicio;

    const haciaAtras = event.inputType === 'deleteContentBackward';
    if (haciaAtras || event.inputType === 'deleteContentForward') {
      if (inicio !== fin) return;
      const tramos = this.tramos();
      const cursor = tramos && saltarSeparadorAlBorrar(input.value, inicio, haciaAtras, tramos);
      if (cursor === null) return;
      event.preventDefault();
      input.setSelectionRange(cursor, cursor);
      return;
    }

    if (event.inputType !== 'insertText' || !event.data || event.data.length !== 1) return;
    // Al final del texto teclea una fecha nueva: de eso se encarga `onInput`.
    if (fin >= input.value.length) return;

    const tramos = this.tramos();
    if (!tramos) return;
    const edicion = editarEnMedio(input.value, inicio, fin, event.data, tramos);
    if (!edicion) return;

    event.preventDefault();
    // Tecla que no entró o que solo cruzó un separador: el texto es el mismo y
    // PrimeNG no tiene nada nuevo que parsear. Avisarle igual lo haría emitir
    // otra vez la misma fecha.
    if (edicion.valor === input.value) {
      if (edicion.cursor !== inicio) input.setSelectionRange(edicion.cursor, edicion.cursor);
      return;
    }
    input.value = edicion.valor;
    input.setSelectionRange(edicion.cursor, edicion.cursor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private onInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const tipo = event instanceof InputEvent ? event.inputType : '';
    if (tipo.startsWith('delete')) return;

    // Con el cursor en medio la tecla ya la resolvió `onBeforeInput`.
    const original = input.value;
    const cursor = input.selectionStart ?? original.length;
    if (cursor < original.length) return;

    const tramos = this.tramos();
    if (!tramos) return;

    const tecleado = tipo === 'insertText' || tipo === 'insertCompositionText';
    const enmascarado = tecleado
      ? aplicarMascara(original, tramos)
      : enmascararPegado(original, tramos);
    if (enmascarado === null || enmascarado === original) return;
    input.value = enmascarado;
    input.setSelectionRange(enmascarado.length, enmascarado.length);
  }
}
