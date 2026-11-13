import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Botonera de los informes contables: **Exportar** (Excel y, si el informe lo
 * sirve, PDF) y **Generar**.
 *
 * Componente tonto: recibe los estados y emite. Las acciones pegan al mismo
 * endpoint con los mismos parámetros, pero las descargas se habilitan
 * únicamente sobre un informe ya generado.
 *
 * Las descargas van en un **desplegable** y no como botones sueltos: es el
 * estándar del ERP (el «Acciones» de los listados, «Utilidades» en las fichas)
 * y deja a Generar como la única acción con color de la botonera.
 */
@Component({
  selector: 'app-movimiento-informe-actions',
  standalone: true,
  imports: [ButtonModule, MenuModule],
  template: `
    @let d = t();
    <div class="flex items-center justify-end gap-2">
      <!--
        Aviso de parámetros desactualizados. Ámbar y no rojo: no es un error,
        es un desvío legítimo —lo que se ve dejó de corresponder a lo que dice
        el formulario— y la salida es volver a generar. Mismo idioma que el
        aviso de vencimiento de los documentos comerciales.
      -->
      @if (hint()) {
        <span class="mr-auto flex items-center gap-1.5 text-[0.78rem] text-amber-700">
          <i class="pi pi-exclamation-circle text-[0.8rem]"></i>{{ hint() }}
        </span>
      }
      <!--
        Controles de vista del informe (p. ej. mostrar la variación): no cambian
        la consulta, así que van con la botonera y no en el panel de parámetros.
      -->
      <ng-content />
      <p-button
        [label]="d.common.actions.export"
        icon="pi pi-chevron-down"
        iconPos="right"
        severity="secondary"
        [outlined]="true"
        size="small"
        [loading]="exportingExcel() || exportingPdf()"
        [disabled]="!canExport()"
        (onClick)="exportMenu.toggle($event)"
      />
      <p-menu #exportMenu [popup]="true" [model]="exportItems()" appendTo="body" />
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
export class MovimientoInformeActionsComponent {
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

  /**
   * Ofrecer la descarga en PDF. Lo alimenta `soportaPdf` de la página base, hoy
   * encendido solo en el certificado de retención: la acción `pdf/` responde
   * 400 a los otros ocho informes. Se declara por informe y no de una vez
   * porque el ERP anterior dejaba el botón puesto sin efecto en el resto.
   */
  readonly showPdf = input<boolean>(true);

  /**
   * Aviso contextual a la izquierda de los botones. Vacío = no se pinta (y no
   * cuesta ranura: es un `@if`, no un host vacío).
   *
   * Lo usa el balance de prueba para avisar que los parámetros cambiaron
   * después de generar, así lo que se ve en la tabla no se lee como vigente.
   */
  readonly hint = input<string>('');

  /**
   * Ítems del desplegable. `computed` y no un getter: `<p-menu [model]>` pierde
   * el primer clic si recibe un array nuevo en cada detección de cambios.
   */
  protected readonly exportItems = computed<MenuItem[]>(() => {
    const actions = this.t().common.actions;
    const items: MenuItem[] = [
      {
        label: actions.exportExcel,
        icon: 'pi pi-file-excel',
        command: () => this.excel.emit(),
      },
    ];
    if (this.showPdf()) {
      items.push({
        label: actions.exportPdf,
        icon: 'pi pi-file-pdf',
        command: () => this.pdf.emit(),
      });
    }
    return items;
  });

  readonly generar = output<void>();
  readonly excel = output<void>();
  readonly pdf = output<void>();
}
