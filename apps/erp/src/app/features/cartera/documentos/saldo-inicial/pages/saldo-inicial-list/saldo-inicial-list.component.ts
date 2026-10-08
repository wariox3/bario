import { Component, inject } from '@angular/core';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Carcasa del documento **Saldo inicial** (Cartera — CxC, `documento_tipo_id 18`).
 *
 * Shell vacío a propósito: solo deja el punto de entrada navegable en el módulo,
 * en paralelo a la carcasa de Tesorería (Saldo inicial CxP, tipo 19). Pendiente
 * de implementar como documento del framework configuracional (camino A) — de
 * momento no toca `CARTERA_CONFIG` ni el registry.
 */
@Component({
  selector: 'app-cartera-saldo-inicial-list',
  standalone: true,
  template: `
    <div class="saldo-inicial">
      <h1 class="saldo-inicial__title">{{ t().entities.saldoInicial.name }}</h1>
      <p class="saldo-inicial__sub">{{ t().common.comingSoon }}</p>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .saldo-inicial {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 4rem 1rem;
        text-align: center;
        color: var(--brand-muted);
      }
      .saldo-inicial__title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--brand-navy);
      }
      .saldo-inicial__sub {
        margin: 0;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class SaldoInicialListComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;
}
