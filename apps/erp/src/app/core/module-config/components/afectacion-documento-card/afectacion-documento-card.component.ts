import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService, formatCop, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { AfectacionDocumentoRead } from './afectacion-documento.types';

/**
 * Card de un documento dentro de los modales de afectación: tipo e ids, fecha y
 * contacto, y la banda de montos. Solo presenta lo que recibe.
 *
 * La comparten el modal por **línea** de la ficha (`AfectacionModalComponent`),
 * que además muestra el id del detalle, y el modal por **documento** del listado
 * (`DocumentoAfectacionModalComponent`), que no tiene detalle de partida.
 */
@Component({
  selector: 'app-afectacion-documento-card',
  standalone: true,
  templateUrl: './afectacion-documento-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AfectacionDocumentoCardComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Rótulo de la card (p. ej. «Documento», «Documento afectado»). */
  readonly titulo = input.required<string>();
  readonly documento = input.required<AfectacionDocumentoRead>();
  /** Muestra el «Detalle ID»; solo aplica cuando se parte de una línea. */
  readonly mostrarDetalleId = input<boolean>(false);
  readonly detalleId = input<number | null>(null);

  protected readonly formatMoney = formatCop;

  /** Fecha ISO a formato corto, sin desfase TZ. */
  protected formatFecha(value: string | null | undefined): string {
    return formatFechaCorta(value, '');
  }
}
