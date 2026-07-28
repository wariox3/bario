import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Botonera de los informes contables: **PDF**, **Excel** y **Generar**.
 *
 * Componente tonto: recibe los estados y emite. Las tres acciones pegan al
 * mismo endpoint con los mismos parámetros —solo cambia una bandera del body—,
 * pero las descargas se habilitan únicamente sobre un informe ya generado.
 */
@Component({
  selector: 'app-informe-cuentas-actions',
  standalone: true,
  imports: [ButtonModule],
  template: `
    @let d = t();
    <div class="flex items-center justify-end gap-2">
      <p-button
        icon="pi pi-file-pdf"
        severity="secondary"
        [outlined]="true"
        size="small"
        [label]="d.common.actions.exportPdf"
        [loading]="exportingPdf()"
        [disabled]="!canExport()"
        (onClick)="pdf.emit()"
      />
      <p-button
        icon="pi pi-file-excel"
        severity="secondary"
        [outlined]="true"
        size="small"
        [label]="d.common.actions.exportExcel"
        [loading]="exportingExcel()"
        [disabled]="!canExport()"
        (onClick)="excel.emit()"
      />
      <p-button
        icon="pi pi-bolt"
        size="small"
        [label]="d.entities.informeCuentas.generar"
        [loading]="loading()"
        [disabled]="busy()"
        (onClick)="generar.emit()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformeCuentasActionsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Consulta en curso — el botón Generar muestra su spinner. */
  readonly loading = input<boolean>(false);
  readonly exportingExcel = input<boolean>(false);
  readonly exportingPdf = input<boolean>(false);
  /** Alguna de las tres en curso — bloquea Generar. */
  readonly busy = input<boolean>(false);
  /** Hay un informe generado sobre el que descargar. */
  readonly canExport = input<boolean>(false);

  readonly generar = output<void>();
  readonly excel = output<void>();
  readonly pdf = output<void>();
}
