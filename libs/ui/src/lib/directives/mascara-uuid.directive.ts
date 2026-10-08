import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl, Validators, type ValidatorFn } from '@angular/forms';

/** Posiciones (en hex) antes de las que va un guion: `8-4-4-4-12`. */
const CORTES = [8, 12, 16, 20] as const;
const LARGO_HEX = 32;

/** Largo de un UUID con guiones. */
export const UUID_LARGO = 36;

/** Lo que muestra el input vacío: la forma que se espera. */
export const UUID_PLACEHOLDER = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

/** UUID completo, en minúsculas o mayúsculas. */
export const uuidValidator: ValidatorFn = Validators.pattern(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

/** Deja solo los hexadecimales (en minúsculas), hasta 32. */
function soloHex(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^0-9a-f]/g, '')
    .slice(0, LARGO_HEX);
}

/**
 * Arma el UUID a medida que se escribe: descarta lo que no es hexadecimal y
 * pone los guiones en `8-4-4-4-12`. Un guion aparece recién cuando hay algo
 * después, así borrar hacia atrás no se traba en él.
 */
export function formatearUuid(texto: string): string {
  const hex = soloHex(texto);
  let salida = '';
  for (const [i, caracter] of [...hex].entries()) {
    if ((CORTES as readonly number[]).includes(i)) salida += '-';
    salida += caracter;
  }
  return salida;
}

/** Posición en el texto formateado del cursor que tenía `hex` caracteres antes. */
function posicionFormateada(hex: number): number {
  return hex + CORTES.filter((corte) => corte < hex).length;
}

/**
 * Máscara de UUID (`94966156-8084-428b-b1b1-a903a053aed1`) para un input de
 * texto, mientras se escribe y al pegar. Actualiza el `FormControl` asociado
 * para que el modelo quede igual que la vista.
 *
 * Solo da forma: que esté **completo** lo valida `uuidValidator`, y el tope va
 * con `[maxlength]="UUID_LARGO"` en el template. Pensada para identificadores
 * que se copian de otro sistema (los de la DIAN): pegar uno con espacios o en
 * mayúsculas entra limpio.
 */
@Directive({
  selector: 'input[libMascaraUuid]',
  standalone: true,
})
export class MascaraUuidDirective {
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });

  @HostListener('input')
  onInput(): void {
    const input = this.host.nativeElement;
    const original = input.value;
    const formateado = formatearUuid(original);
    if (original === formateado) return;

    // El cursor se reubica contando hexadecimales, no caracteres: los guiones
    // que entran o salen lo correrían en cada tecleo en medio del texto.
    const cursor = input.selectionStart ?? original.length;
    const hexAntes = soloHex(original.slice(0, cursor)).length;
    const posicion = Math.min(posicionFormateada(hexAntes), formateado.length);

    this.ngControl?.control?.setValue(formateado);
    input.value = formateado;
    input.setSelectionRange(posicion, posicion);
  }
}
