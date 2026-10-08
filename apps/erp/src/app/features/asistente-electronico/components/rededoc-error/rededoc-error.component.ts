import { Component, input } from '@angular/core';
import type { RedEDocError } from '../../rededoc-error';

/**
 * Banda con el error de una acción en RedEDoc: título, un renglón por error y,
 * si el backend lo informa, el id del emisor (lo que se le cita a soporte).
 *
 * Tonta: no sabe de qué acción viene ni qué se puede hacer después; eso lo
 * decide el paso que la usa. Va pegada a la botonera de la acción que falló,
 * no en un toast: es un motivo para leer con calma.
 */
@Component({
  selector: 'app-rededoc-error',
  standalone: true,
  templateUrl: './rededoc-error.component.html',
})
export class RededocErrorComponent {
  readonly titulo = input.required<string>();
  readonly error = input.required<RedEDocError>();
  /** Rótulo del id del emisor (`Emisor`). */
  readonly emisorLabel = input<string>('');
}
