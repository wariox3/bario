import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DOCUMENT_TYPE_ID, I18nService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import {
  POS_DOCUMENTO_TIPOS,
  type PosDocumentoTipoId,
} from '../../../../configuracion/configuracion-caja.model';
import { CarritosStore } from '../../carritos.store';

/**
 * Tipo de documento de la venta activa (factura POS o POS electrónica), como
 * selector segmentado. Arranca con el de la empresa; ver `conTipoDocumento`.
 *
 * Con un cobro pendiente se deshabilita: su documento ya se creó con un tipo.
 * No se pinta mientras el tipo de la empresa no se conozca.
 */
@Component({
  selector: 'app-tipo-documento-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.tipoDocumento(); as tipoActual) {
      <div class="flex items-center gap-2">
        <span class="text-[0.72rem] font-medium text-brand-muted">{{ tx().grupo }}</span>
        <div
          role="radiogroup"
          class="inline-flex gap-0.5 rounded-md border border-[rgba(20,48,73,0.1)] bg-brand-surface p-0.5"
          [attr.aria-label]="tx().grupo"
        >
          @for (tipo of tipos(); track tipo.id) {
            @let activo = tipo.id === tipoActual;
            <button
              type="button"
              role="radio"
              class="rounded px-2 py-px text-[0.72rem] font-medium transition-colors disabled:cursor-not-allowed"
              [class]="
                activo
                  ? 'bg-[rgba(20,48,73,0.1)] text-brand-navy'
                  : 'text-brand-muted enabled:hover:bg-[rgba(20,48,73,0.04)] enabled:hover:text-brand-text'
              "
              [attr.data-tipo]="tipo.id"
              [attr.aria-checked]="activo"
              [attr.tabindex]="activo ? 0 : -1"
              [title]="tipo.nombre"
              [disabled]="bloqueada()"
              (click)="store.cambiarTipoDocumento(tipo.id)"
              (keydown)="onTecla($event, tipoActual)"
            >
              {{ corto() ? tipo.etiqueta : tipo.nombre }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class TipoDocumentoSelectorComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly store = inject(CarritosStore);

  /** Etiquetas cortas («POS» / «Electrónica»); el nombre completo queda en el `title`. */
  readonly corto = input(false);

  protected readonly tx = computed(() => this.i18n.t().vender.carrito.tipoDocumento);
  protected readonly bloqueada = computed(() => this.store.cobroPendiente() !== null);

  protected readonly tipos = computed(() => {
    const corto = this.tx();
    const largo = this.i18n.t().configuracion.tipos;
    return POS_DOCUMENTO_TIPOS.map((id) =>
      id === DOCUMENT_TYPE_ID.FACTURA_POS
        ? { id, etiqueta: corto.pos, nombre: largo.pos }
        : { id, etiqueta: corto.posElectronica, nombre: largo.posElectronica },
    );
  });

  /** Flechas dentro del grupo de radios: con dos opciones, cualquiera pasa a la otra. */
  protected onTecla(evento: KeyboardEvent, actual: PosDocumentoTipoId): void {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evento.key)) return;
    evento.preventDefault();
    const otro = POS_DOCUMENTO_TIPOS.find((tipo) => tipo !== actual);
    if (otro === undefined) return;
    this.store.cambiarTipoDocumento(otro);
    const grupo = (evento.currentTarget as HTMLElement).parentElement;
    grupo?.querySelector<HTMLButtonElement>(`[data-tipo="${otro}"]`)?.focus();
  }
}
