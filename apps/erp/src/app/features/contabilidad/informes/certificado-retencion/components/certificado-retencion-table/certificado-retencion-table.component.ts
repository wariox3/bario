import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService, formatCop, toFiniteNumber } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { CertificadoRetencionRow } from '../../certificado-retencion.model';

/**
 * Tabla del informe **Certificado de retención**: qué se le retuvo a cada
 * tercero y sobre qué base, por cuenta de retención.
 *
 * Componente tonto y **propio de este informe**: sus seis columnas no coinciden
 * con las de saldos ni con las del informe *base*.
 *
 * Cierra con los totales de base y retenido. El informe original no los
 * pintaba, pero son la cifra de control del periodo —lo que se declara— y sin
 * ellos había que exportar a Excel para conocerlos.
 */
@Component({
  selector: 'app-certificado-retencion-table',
  standalone: true,
  templateUrl: './certificado-retencion-table.component.html',
  styleUrl: './certificado-retencion-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadoRetencionTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly rows = input.required<readonly CertificadoRetencionRow[]>();

  /**
   * `true` una vez que el usuario generó el informe. Distingue "todavía no
   * generaste" de "no hay resultados", que se leen muy distinto.
   */
  readonly generated = input<boolean>(false);

  protected readonly totalBase = computed(() =>
    this.rows().reduce((acc, row) => acc + (toFiniteNumber(row.base_retenido) ?? 0), 0),
  );
  protected readonly totalRetenido = computed(() =>
    this.rows().reduce((acc, row) => acc + (toFiniteNumber(row.retenido) ?? 0), 0),
  );

  protected formatMonto(value: number | string | null): string {
    return formatCop(value ?? 0);
  }
}
