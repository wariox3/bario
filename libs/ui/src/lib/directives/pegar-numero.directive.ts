import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { InputNumber } from 'primeng/inputnumber';

/**
 * Texto pegado → número, sea cual sea la notación de origen.
 *
 * Lo copiado puede venir con punto decimal (`5000.6`, de una hoja o de otro
 * sistema) o con la notación local (`5.000,6`). Reglas:
 * - Con los dos separadores, el último es el decimal (`5.000,6`, `5,000.6`).
 * - Una coma sola es decimal (`5000,6`); varias, de miles (`1,234,567`).
 * - Un punto solo es de miles si lo siguen exactamente tres dígitos (`16.065`);
 *   si no, es decimal (`5000.6`, `16065.00`). Varios puntos, de miles.
 *
 * Ignora el `$`, los espacios y el texto alrededor. `null` si no queda un número.
 */
export function interpretarNumeroPegado(texto: string): number | null {
  const limpio = texto.replace(/[^\d.,-]/g, '');
  const negativo = limpio.startsWith('-');
  const cuerpo = limpio.replace(/-/g, '');
  if (!/\d/.test(cuerpo)) return null;

  const decimal = separadorDecimal(cuerpo);
  const [entera, fraccion = ''] = decimal ? partirEnUltimo(cuerpo, decimal) : [cuerpo];
  const numero = Number(`${entera.replace(/[.,]/g, '')}.${fraccion.replace(/[.,]/g, '')}`);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

/** El separador que hace de decimal en `cuerpo`, o `null` si todos son de miles. */
function separadorDecimal(cuerpo: string): '.' | ',' | null {
  const ultimoPunto = cuerpo.lastIndexOf('.');
  const ultimaComa = cuerpo.lastIndexOf(',');
  if (ultimoPunto !== -1 && ultimaComa !== -1) return ultimoPunto > ultimaComa ? '.' : ',';
  if (ultimaComa !== -1) return cuerpo.indexOf(',') === ultimaComa ? ',' : null;
  if (ultimoPunto === -1 || cuerpo.indexOf('.') !== ultimoPunto) return null;
  return /\.\d{3}$/.test(cuerpo) ? null : '.';
}

function partirEnUltimo(cuerpo: string, separador: string): [string, string] {
  const i = cuerpo.lastIndexOf(separador);
  return [cuerpo.slice(0, i), cuerpo.slice(i + 1)];
}

/**
 * Pegar en un `<p-inputnumber>` conserva la parte decimal de lo copiado.
 *
 * PrimeNG interpreta lo pegado con la notación del locale: en español el punto
 * es de miles, así que `5000.6` quedaba en `50.006`. La directiva toma el pegado
 * antes que el componente, lo lee con `interpretarNumeroPegado` y lo escribe
 * como valor del campo (reemplaza lo que hubiera). El redondeo a los decimales
 * del campo y los `min`/`max` siguen en manos de PrimeNG.
 *
 * El selector es el propio elemento: todo `<p-inputnumber>` del componente que
 * la importe queda cubierto sin marcarlo.
 */
@Directive({
  // Va sobre el elemento de PrimeNG, como `MascaraFechaDirective`: por eso
  // `eslint.config.mjs` le apaga `directive-selector`.
  selector: 'p-inputnumber, p-inputNumber, p-input-number',
  standalone: true,
})
export class PegarNumeroDirective {
  private readonly inputNumber = inject(InputNumber, { self: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const alPegar = (event: ClipboardEvent): void => this.pegar(event);
    this.host.addEventListener('paste', alPegar, { capture: true });
    inject(DestroyRef).onDestroy(() =>
      this.host.removeEventListener('paste', alPegar, { capture: true }),
    );
  }

  private pegar(event: ClipboardEvent): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) return;
    const numero = interpretarNumeroPegado(event.clipboardData?.getData('text') ?? '');
    if (numero === null) return;

    // El pegado no llega al `(paste)` del componente, que lo leería en el locale.
    event.preventDefault();
    event.stopPropagation();
    const texto = this.inputNumber.formatValue(numero);
    this.inputNumber.updateValue(event, texto, texto, 'insert');
  }
}
