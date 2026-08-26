import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Deja en un input solo dígitos, mientras se escribe y al pegar. Actualiza el
 * `FormControl` asociado (ReactiveForms) para que el modelo quede limpio, no
 * solo la vista.
 *
 * Pensada para los campos que guardan un número como texto —celular, teléfono,
 * número de identificación, cuenta bancaria—, donde el valor se compara y se
 * busca: si uno se guarda como `310 555 1234` y otro como `3105551234`, dejan de
 * ser el mismo número para el backend.
 *
 * **No** impone un largo ni un formato: el tope va con `maxlength` en el
 * template, y así un número extranjero, más corto o más largo que el local,
 * sigue entrando. Formatear para leer es tarea de `TelefonoPipe`, en la ficha.
 *
 * Su ganancia principal es pegar: un número copiado de WhatsApp o de un correo
 * llega con espacios, guiones o paréntesis, y entra limpio sin que el usuario
 * lo edite a mano.
 */
@Directive({
  selector: 'input[libSoloDigitos]',
  standalone: true,
})
export class SoloDigitosDirective {
  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly ngControl = inject(NgControl, { optional: true });

  @HostListener('input')
  onInput(): void {
    const input = this.host.nativeElement;
    const original = input.value;
    const soloDigitos = original.replace(/\D/g, '');
    if (original === soloDigitos) return;

    // El cursor se reubica contando **dígitos**, no caracteres: al limpiar
    // separadores el texto se acorta, y conservar el índice crudo saltaría el
    // cursor hacia adelante en cada tecleo dentro de un número ya escrito.
    const cursor = input.selectionStart ?? original.length;
    const digitosAntes = original.slice(0, cursor).replace(/\D/g, '').length;

    this.ngControl?.control?.setValue(soloDigitos);
    input.value = soloDigitos;
    input.setSelectionRange(digitosAntes, digitosAntes);
  }
}
