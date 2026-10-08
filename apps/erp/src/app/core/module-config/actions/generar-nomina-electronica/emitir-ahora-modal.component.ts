import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Pregunta de seguimiento tras generar: "¿emitir ahora a la DIAN?".
 *
 * Encadena las dos mitades del flujo —consolidar y emitir— que es el orden en
 * que se usan; viene del ERP anterior y se conserva.
 *
 * Es un modal propio y no un `p-confirmDialog` porque la acción se ejecuta desde
 * un `EntityActionStrategy` provisto en root, y el único `ConfirmationService`
 * del listado vive a nivel de componente: desde acá no se alcanza. `DialogService`
 * sí está en root.
 *
 * Cierra con `true` si el usuario quiere ir a emitir, `false` si no.
 */
@Component({
  selector: 'app-emitir-ahora-modal',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @let d = t().entities.nominaElectronica.generar.emitirAhora;

    <div class="flex flex-col gap-5">
      <div class="flex items-center gap-3.5">
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-blue/15"
        >
          <i class="pi pi-send text-[1.1rem] text-brand-blue"></i>
        </span>
        <div class="flex flex-col gap-[0.1rem]">
          <h2
            class="m-0 text-[1.05rem] font-extrabold leading-tight tracking-[-0.03em] text-brand-navy"
          >
            {{ d.header }}
          </h2>
          <p class="m-0 text-[0.75rem] tracking-[0.01em] text-brand-muted">{{ d.message }}</p>
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
        <p-button type="button" [label]="d.accept" icon="pi pi-send" (onClick)="close(true)" />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmitirAhoraModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected close(irAEmitir: boolean): void {
    this.ref.close(irAEmitir);
  }
}
