import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/** Lo que el strategy le pasa al modal por `data`. */
export interface AnularConfirmData {
  readonly cantidad: number;
}

/**
 * Confirmación antes de anular los documentos marcados en el listado. Dice
 * cuántos son y que no tiene vuelta atrás. Sigue la regla de confirmaciones de
 * `.interface-design/system.md`: triángulo de advertencia, solo la acción con
 * color (rojo, con `pi-ban`) y cancelar como texto. Sin autofoco en Anular: un
 * Enter de más no debe congelar documentos.
 *
 * Cierra con `true` si confirma y `false` si cancela.
 */
@Component({
  selector: 'app-anular-confirm-modal',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @let d = t().documentActions.anularLista.confirmar;

    <div class="flex flex-col gap-5">
      <div class="flex items-center gap-3.5">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600"
        >
          <i class="pi pi-exclamation-triangle text-[1.1rem]"></i>
        </span>
        <div class="flex flex-col gap-[0.1rem]">
          <h2
            class="m-0 text-[1.05rem] font-extrabold leading-tight tracking-[-0.03em] text-brand-navy"
          >
            {{ titulo() }}
          </h2>
          <p class="m-0 text-[0.75rem] tracking-[0.01em] text-brand-muted">{{ mensaje() }}</p>
        </div>
      </div>

      <div
        class="mt-1 flex items-center justify-end gap-3 border-t border-[rgba(20,48,73,0.08)] pt-5"
      >
        <p-button
          type="button"
          [label]="d.reject"
          [text]="true"
          severity="secondary"
          (onClick)="close(false)"
        />
        <p-button
          type="button"
          [label]="d.accept"
          icon="pi pi-ban"
          severity="danger"
          (onClick)="close(true)"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnularConfirmModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject<DynamicDialogConfig<AnularConfirmData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly cantidad = this.config.data?.cantidad ?? 0;

  protected readonly titulo = computed(() => {
    const d = this.t().documentActions.anularLista.confirmar;
    return this.cantidad === 1 ? d.headerUno : d.header;
  });

  protected readonly mensaje = computed(() => {
    const d = this.t().documentActions.anularLista.confirmar;
    const cantidad = this.cantidad;
    return cantidad === 1
      ? d.messageUno
      : d.message.replace('{n}', cantidad.toLocaleString('es-CO'));
  });

  protected close(confirmado: boolean): void {
    this.ref.close(confirmado);
  }
}
