import { Component, input } from '@angular/core';

/**
 * Tarjeta de un archivo: loseta con ícono, nombre (recortado, completo en el
 * `title`) y una línea de apoyo. La acción de la derecha (quitar, eliminar)
 * llega por `ng-content`, porque cada pantalla decide qué se puede hacer.
 *
 * La usan el importar (el Excel elegido) y el certificado digital (el elegido y
 * el ya cargado): el mismo objeto se ve igual en todos sus estados.
 */
@Component({
  selector: 'app-file-card',
  standalone: true,
  templateUrl: './file-card.component.html',
  host: { class: 'block' },
})
export class FileCardComponent {
  readonly nombre = input.required<string>();
  /** Línea de apoyo (tamaño, vigencia…). Vacía = no se pinta. */
  readonly meta = input<string>('');
  /** Clase de PrimeIcons, sin el `pi` (`pi-file-excel`). */
  readonly icon = input<string>('pi-file');
  /** Color de la loseta: verde para Excel, sky para el resto. */
  readonly tono = input<'sky' | 'emerald'>('sky');
  /** Atenuada mientras una acción sobre el archivo está en curso. */
  readonly busy = input(false);
}
