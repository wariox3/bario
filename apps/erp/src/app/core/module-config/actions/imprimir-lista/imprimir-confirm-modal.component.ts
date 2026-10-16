import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/** Lo que el strategy le pasa al modal por `data`. */
export interface ImprimirConfirmData {
  readonly cantidad: number;
}

/**
 * Confirmación antes de imprimir muchos documentos de una vez: dice cuántos son
 * para que la persona no lance sin querer la impresión del listado entero.
 *
 * Cierra con `true` si confirma y `false` si cancela.
 */
@Component({
  selector: 'app-imprimir-confirm-modal',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @let d = t().documentActions.imprimirLista.confirmar;

    <div class="flex flex-col gap-5">
      <div class="flex items-center gap-3.5">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue/15"
        >
          <i class="pi pi-print text-[1.1rem] text-brand-blue"></i>
        </span>
        <div class="flex flex-col gap-[0.1rem]">
          <h2
            class="m-0 text-[1.05rem] font-extrabold leading-tight tracking-[-0.03em] text-brand-navy"
          >
            {{ d.header }}
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
          [outlined]="true"
          severity="secondary"
          (onClick)="close(false)"
        />
        <p-button type="button" [label]="d.accept" icon="pi pi-print" (onClick)="close(true)" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImprimirConfirmModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject<DynamicDialogConfig<ImprimirConfirmData>>(DynamicDialogConfig);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly mensaje = computed(() =>
    this.t().documentActions.imprimirLista.confirmar.message.replace(
      '{n}',
      (this.config.data?.cantidad ?? 0).toLocaleString('es-CO'),
    ),
  );

  protected close(confirmado: boolean): void {
    this.ref.close(confirmado);
  }
}
