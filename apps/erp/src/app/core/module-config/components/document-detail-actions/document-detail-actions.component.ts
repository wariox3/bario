import { Component, computed, inject, input, output, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Botonera de acciones de un documento en su **vista de detalle**: Aprobar,
 * Imprimir, un dropdown "Acciones" (Desaprobar y, opcionalmente, Anular) y un
 * dropdown "Opciones" (hoy con "Archivos"). Compartida por todas las fichas de
 * detalle (servicio, factura de venta y futuras).
 *
 * Es **presentacional**: renderiza los botones y emite eventos; cada ficha decide
 * qué hacer. Los botones se deshabilitan según el estado del documento vía los
 * inputs `can*` (todos habilitados por default; las fichas los cablearán a su estado).
 *
 * Dos acciones son **opt-in** vía `showAnular` / `showEmitir`, apagadas por
 * default: no todo documento se anula ni se emite a la DIAN, y esta botonera la
 * comparte todo el ERP. Prenderlas por default le pondría botones a fichas cuyo
 * backend no los atiende.
 */
@Component({
  selector: 'app-document-detail-actions',
  standalone: true,
  imports: [ButtonModule, MenuModule],
  templateUrl: './document-detail-actions.component.html',
  styleUrl: './document-detail-actions.component.scss',
})
export class DocumentDetailActionsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Habilita cada acción. Default `true`; las fichas los atan al estado del documento. */
  readonly canAprobar = input<boolean>(true);
  readonly canDesaprobar = input<boolean>(true);
  readonly canImprimir = input<boolean>(true);
  readonly canArchivos = input<boolean>(true);
  readonly canAnular = input<boolean>(true);
  readonly canEmitir = input<boolean>(true);

  /** Presencia de las acciones opt-in. Apagadas salvo que la ficha las pida. */
  readonly showAnular = input<boolean>(false);
  readonly showEmitir = input<boolean>(false);

  readonly aprobar = output<void>();
  readonly desaprobar = output<void>();
  readonly imprimir = output<void>();
  readonly archivos = output<void>();
  readonly anular = output<void>();
  readonly emitir = output<void>();

  private readonly accionesMenu = viewChild.required<Menu>('accionesMenu');
  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  /**
   * Entradas del dropdown "Acciones". Mismo patrón `computed` que "Opciones"
   * (ref estable salvo cambio de idioma o de `canDesaprobar`) para que `p-menu`
   * no pierda el primer click al recrear el array en cada CD.
   *
   * "Anular" va acá y no como botón propio: es destructiva e irreversible, así
   * que no conviene tenerla a un click de distancia.
   */
  protected readonly accionesItems = computed<MenuItem[]>(() => {
    const a = this.t().documentActions.detail;
    const items: MenuItem[] = [
      {
        label: a.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: !this.canDesaprobar(),
        command: () => this.desaprobar.emit(),
      },
    ];
    if (this.showAnular()) {
      items.push({
        label: a.anular,
        icon: 'pi pi-ban',
        disabled: !this.canAnular(),
        command: () => this.anular.emit(),
      });
    }
    return items;
  });

  /**
   * Entradas del dropdown "Opciones". `computed` (ref estable salvo cambio real de
   * idioma o de `canArchivos`) para no recrear el array en cada CD — eso provoca
   * que `p-menu` pierda el primer click.
   */
  protected readonly opcionesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().documentActions.detail.archivos,
      icon: 'pi pi-folder',
      disabled: !this.canArchivos(),
      command: () => this.archivos.emit(),
    },
  ]);

  protected toggleAcciones(event: Event): void {
    this.accionesMenu().toggle(event);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }
}
