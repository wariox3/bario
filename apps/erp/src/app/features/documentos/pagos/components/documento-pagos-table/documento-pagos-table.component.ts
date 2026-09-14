import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { I18nService, ToastService, extractErrorMessage, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { PagoFormRawValue } from '../../pago.form';
import { DocumentoPagoService } from '../../pago.service';

/**
 * Tabla de **solo lectura** de los pagos de un documento, para la ficha de detalle.
 *
 * Gemela de `DocumentoPagosComponent` (editable), igual que
 * `comercial-documento-lineas-table` lo es de la tabla de detalles: misma estructura
 * visual, celdas de texto. La única acción que resuelve es **anular** un pago
 * (confirmación + `POST documento-pago/anular/`), porque es lo único que se hace
 * sobre un documento aprobado; al terminar emite `anulado` para que la ficha
 * recargue lo recibido y lo pendiente. Los anulados se pintan con su valor tachado.
 */
@Component({
  selector: 'app-documento-pagos-table',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './documento-pagos-table.component.html',
  styleUrl: './documento-pagos-table.component.scss',
})
export class DocumentoPagosTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly pagoService = inject(DocumentoPagoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;

  /** Pagos a renderizar (read mapeado a la forma del front), anulados incluidos. */
  readonly pagos = input.required<readonly PagoFormRawValue[]>();

  /**
   * ¿Se pueden anular? Lo decide la ficha: documento aprobado, sin contabilizar ni
   * anulado, y que no sea una nota crédito (su pago no se anula, se desaprueba la nota).
   */
  readonly anulable = input<boolean>(false);

  /** Un pago se anuló en el backend: la ficha recarga el documento. */
  readonly anulado = output<void>();

  /** Id del pago que se está anulando (bloquea su botón). */
  protected readonly anulandoId = signal<number | null>(null);

  protected onAnular(pago: PagoFormRawValue): void {
    const id = pago.id;
    if (id == null || this.anulandoId() != null) return;
    const p = this.t().entities.documentoPago;
    this.confirmation.confirm({
      header: p.confirmAnular.header,
      message: p.confirmAnular.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: p.confirmAnular.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.anular(id),
    });
  }

  private anular(id: number): void {
    const toasts = this.t().entities.documentoPago.toasts;
    this.anulandoId.set(id);
    this.pagoService
      .anular(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.anulandoId.set(null);
          this.toast.success(toasts.anularSuccess.title, toasts.anularSuccess.desc);
          this.anulado.emit();
        },
        error: (err: unknown) => {
          this.anulandoId.set(null);
          this.toast.error(
            toasts.anularError.title,
            extractErrorMessage(err, toasts.anularError.desc),
          );
        },
      });
  }
}
