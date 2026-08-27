import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService, formatCop, formatFechaCorta, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { CreditoService } from '../../credito.service';
import type { CreditoPago } from '../../credito.model';

/** Fila de la tabla: el pago con sus valores ya formateados. */
interface PagoFila {
  readonly id: number;
  readonly pago: string;
  readonly fecha: string;
  readonly documento: string;
}

/**
 * Pagos aplicados a un crédito: cada descuento hecho al empleado en una nómina.
 *
 * Se monta dentro de la ficha y se carga solo, igual que el visor de
 * inconsistencias de un periodo. Las columnas de fecha y documento son
 * **opcionales en el contrato**, así que solo se pintan si alguna fila las trae:
 * una columna entera de guiones no dice nada.
 *
 * ⚠️ El endpoint `/humano/credito/{id}/pagos/` está pedido pero todavía no
 * existe; hasta entonces esto muestra su estado de error.
 */
@Component({
  selector: 'app-credito-pagos',
  standalone: true,
  templateUrl: './credito-pagos.component.html',
})
export class CreditoPagosComponent implements OnInit {
  private readonly service = inject(CreditoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly creditoId = input.required<number>();

  protected readonly pagos = signal<readonly CreditoPago[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  protected readonly filas = computed<readonly PagoFila[]>(() =>
    this.pagos().map((p) => ({
      id: p.id,
      pago: formatCop(p.pago),
      fecha: formatFechaCorta(p.fecha),
      documento: p.documento != null ? String(p.documento) : '',
    })),
  );

  /** Total descontado hasta hoy: el dato que se busca al abrir la tabla. */
  protected readonly total = computed(() =>
    formatCop(this.pagos().reduce((suma, p) => suma + (toFiniteNumber(p.pago) ?? 0), 0)),
  );

  protected readonly muestraFecha = computed(() => this.filas().some((f) => f.fecha !== ''));
  protected readonly muestraDocumento = computed(() =>
    this.filas().some((f) => f.documento !== ''),
  );

  ngOnInit(): void {
    this.service
      .pagos(this.creditoId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (rows) => this.pagos.set(rows),
        error: () => this.hasError.set(true),
      });
  }
}
