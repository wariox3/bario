import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import { FORMATO_FECHA, I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { DocumentoElectronicoErrorService } from '../../documento-electronico-error.service';
import type { DocumentoElectronicoError } from '../../documento-electronico.types';

/** Lo que el modal necesita del documento: su id para pedir y su número para el título. */
export interface DocumentoConError {
  readonly id: number;
  readonly numero: string | number | null;
}

/**
 * Modal con el detalle de por qué falló la emisión de un documento electrónico.
 * Lo abre el estado "Error" de las utilidades que emiten (Enviar factura
 * electrónica de venta, Documento electrónico de compra).
 *
 * Al abrir pide los errores del documento (`documento-electronico-error/lista/`)
 * y los lista con su fase (validación o emisión), el mensaje y la fecha. Cada
 * intento reemplaza los del anterior, así que lo que se ve es el último. Al
 * cerrar se vacía, para que otra fila no muestre un instante los de esta.
 */
@Component({
  selector: 'app-error-electronico-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, DatePipe],
  templateUrl: './error-electronico-dialog.component.html',
  styleUrl: './error-electronico-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorElectronicoDialogComponent {
  private readonly service = inject(DocumentoElectronicoErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  /** Documento cuyo error se muestra. */
  readonly documento = input<DocumentoConError | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly errores = signal<readonly DocumentoElectronicoError[]>([]);
  protected readonly formatoFecha = FORMATO_FECHA.angularConHora;

  constructor() {
    effect(() => {
      const documento = this.documento();
      if (!this.visible() || !documento) {
        this.errores.set([]);
        return;
      }
      untracked(() => this.cargar(documento.id));
    });
  }

  private cargar(documentoId: number): void {
    this.isLoading.set(true);
    this.service
      .errores(documentoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      // Si falla, avisa el interceptor; el modal queda en su estado vacío.
      .subscribe({ next: (response) => this.errores.set(response.results) });
  }
}
