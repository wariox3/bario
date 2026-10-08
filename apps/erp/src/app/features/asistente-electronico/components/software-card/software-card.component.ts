import { Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { SoftwareRedEDoc, SoftwareTipo } from '../../electronico.model';

/** Ícono de cada tipo de documento: lo que se emite con ese software. */
const ICONO: Readonly<Record<SoftwareTipo, string>> = {
  facturacion: 'pi-receipt',
  documento_equivalente: 'pi-shop',
  nomina: 'pi-users',
};

/**
 * Tarjeta del software de un tipo de documento en RedEDoc.
 *
 * Tonta: recibe el tipo y su software (o `null` si todavía no existe) y avisa
 * qué quiere hacer la persona. Con software muestra sus datos y su estado ante
 * la DIAN; sin él, ofrece configurarlo. La tarjeta existe siempre, haya o no
 * software: así se ve qué tipos faltan.
 */
@Component({
  selector: 'app-software-card',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './software-card.component.html',
  host: { class: 'flex' },
})
export class SoftwareCardComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly tipo = input.required<SoftwareTipo>();
  readonly software = input<SoftwareRedEDoc | null>(null);

  /** Abrir el modal para registrar el software de este tipo. */
  readonly configurar = output<SoftwareTipo>();
  /** Abrir el modal para corregir el software que ya tiene. */
  readonly actualizar = output<SoftwareRedEDoc>();

  protected readonly icono = computed(() => `pi ${ICONO[this.tipo()]} text-[1.05rem]`);

  /** Habilitado = la DIAN aceptó el set de pruebas; sin software, pendiente de configurar. */
  protected readonly habilitado = computed(() => this.software()?.set_pruebas_aceptado === true);
}
