import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { DocumentoEstados } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { deriveEstadoBadges, type EstadoSeverity } from './document-estados.utils';

/**
 * Fila de badges con el **estado (ciclo de vida)** de un documento, para su ficha
 * de detalle: aprobado, contabilizado, electrónico/DIAN, notificado, generado,
 * anulado. Compartida por todas las fichas de detalle (factura de venta y futuras).
 *
 * Es **presentacional**: recibe las banderas de estado (`DocumentoEstados`) y las
 * pinta; toda la lógica de qué badge mostrar y con qué severidad vive en la
 * función pura `deriveEstadoBadges`. Solo aporta la traducción de severidad →
 * clases Tailwind. El color aquí **significa** (estado del documento), coherente
 * con el sistema calmado del ERP donde el color se reserva para semántica.
 */
@Component({
  selector: 'app-document-estados',
  standalone: true,
  imports: [],
  templateUrl: './document-estados.component.html',
  styleUrl: './document-estados.component.scss',
})
export class DocumentEstadosComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Banderas de estado del documento; solo se pinta el badge de las verdaderas. */
  readonly estados = input.required<DocumentoEstados>();

  /** Badges ya resueltos (texto + severidad) a partir de las banderas. */
  protected readonly badges = computed(() =>
    deriveEstadoBadges(this.estados(), this.t().documentActions.estados),
  );

  /** Clases Tailwind del badge según severidad (tintes tenues, sin bordes duros). */
  protected readonly badgeClasses: Record<EstadoSeverity, string> = {
    positive: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };
}
