import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService, LIST_PAGE_SIZE, formatCop, formatFechaCorta } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { CreditoService } from '../../credito.service';
import type { CreditoPago } from '../../credito.model';

/** Fila de la tabla: el pago con sus valores ya formateados. */
interface PagoFila {
  readonly id: number;
  readonly tipo: string;
  readonly fecha: string;
  readonly numero: string;
  readonly deduccion: string;
}

/**
 * Pagos aplicados a un crédito: cada descuento hecho al empleado en una nómina.
 *
 * Se monta dentro de la ficha y se carga solo, igual que el visor de
 * inconsistencias de un periodo. Los pagos salen de las líneas de documento que
 * apuntan al crédito (ver `CreditoService.pagos`), que ya traen el tipo, la
 * fecha y el número de su documento. Pagina de a 25 como cualquier listado; el
 * total del pie es el `abono` del crédito, porque sumar la página visible solo
 * contaría esas filas.
 */
@Component({
  selector: 'app-credito-pagos',
  standalone: true,
  imports: [PaginatorModule],
  templateUrl: './credito-pagos.component.html',
})
export class CreditoPagosComponent implements OnInit {
  private readonly service = inject(CreditoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly creditoId = input.required<number>();
  /** Total abonado al crédito, tal como lo trae su ficha. */
  readonly abono = input<string | number | null>(null);

  protected readonly pageSize = LIST_PAGE_SIZE;
  protected readonly page = signal(0);
  protected readonly totalPagos = signal(0);
  protected readonly pagos = signal<readonly CreditoPago[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  protected readonly filas = computed<readonly PagoFila[]>(() =>
    this.pagos().map((p) => ({
      id: p.id,
      tipo: p.documento_documento_tipo_nombre ?? '',
      fecha: formatFechaCorta(p.documento_fecha, ''),
      numero: p.documento_numero != null ? String(p.documento_numero) : '',
      deduccion: formatCop(p.deduccion),
    })),
  );

  /** Total descontado hasta hoy: el dato que se busca al abrir la tabla. */
  protected readonly total = computed(() => {
    const abono = this.abono();
    return abono != null ? formatCop(abono) : '';
  });

  ngOnInit(): void {
    this.loadPagos();
  }

  protected onPageChange(event: PaginatorState): void {
    this.page.set(event.page ?? 0);
    this.loadPagos();
  }

  private loadPagos(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service
      .pagos(this.creditoId(), this.page() + 1)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.pagos.set(res.results);
          this.totalPagos.set(res.count);
        },
        error: () => this.hasError.set(true),
      });
  }
}
