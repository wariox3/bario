import { Pipe, type PipeTransform } from '@angular/core';
import { formatTelefono } from '@reddoc/core';

/**
 * Agrupa un número telefónico para leerlo en un template:
 * `3105551234` → `310-555-1234`.
 *
 * Es la envoltura de `formatTelefono`, donde vive la regla (y su spec): un
 * número que no tiene el largo local se muestra tal cual, para no partir en
 * grupos ajenos a un número extranjero.
 */
@Pipe({
  name: 'libTelefono',
  standalone: true,
})
export class TelefonoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatTelefono(valor);
  }
}
