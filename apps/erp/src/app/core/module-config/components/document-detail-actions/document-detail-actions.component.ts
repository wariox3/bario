import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService } from '@reddoc/core';
import { ArchivosDialogComponent } from '@erp/core/components/archivos-dialog/archivos-dialog.component';
import { MODELO } from '@erp/core/permissions';
import type { ArchivoOwner } from '@erp/core/components/archivos-dialog/archivo.types';
import type { AppDict } from '@erp/i18n';

/**
 * Botonera de acciones de un documento en su **vista de detalle**: Aprobar,
 * Imprimir, un dropdown "Acciones" (Desaprobar y, opcionalmente, Anular) y un
 * dropdown "Opciones" (hoy con "Archivos"). Compartida por todas las fichas de
 * detalle (servicio, factura de venta y futuras).
 *
 * Es **presentacional** salvo por una acción: renderiza los botones y emite
 * eventos, y cada ficha decide qué hacer. Los botones se deshabilitan según el
 * estado del documento vía los inputs `can*` (todos habilitados por default; las
 * fichas los cablearán a su estado).
 *
 * La excepción es **Archivos**, que trae su propio diálogo. Es la única acción
 * cuyo comportamiento es idéntico en las 22 fichas —el mismo recurso
 * `general/archivo/`, discriminado solo por el id del documento—, así que
 * emitirla hacia afuera obligaba a repetir el mismo estado y el mismo handler en
 * cada una. Las demás (aprobar, imprimir, anular) sí cambian de endpoint según el
 * documento y siguen siendo del host.
 *
 * Dos acciones son **opt-in** vía `showAnular` / `showEmitir`, apagadas por
 * default: no todo documento se anula ni se emite a la DIAN, y esta botonera la
 * comparte todo el ERP. Prenderlas por default le pondría botones a fichas cuyo
 * backend no los atiende. El eje de aprobación es el caso simétrico:
 * `showAprobacion` y `showImprimir` son el caso simétrico: vienen encendidos y
 * se apagan donde no aplican (las plantillas recurrentes). Si el dropdown
 * "Acciones" se queda sin entradas, no se pinta.
 */
@Component({
  selector: 'app-document-detail-actions',
  standalone: true,
  imports: [ButtonModule, MenuModule, ArchivosDialogComponent],
  templateUrl: './document-detail-actions.component.html',
  styleUrl: './document-detail-actions.component.scss',
})
export class DocumentDetailActionsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /**
   * Id del documento abierto, dueño de los archivos adjuntos.
   *
   * Las fichas lo pasan directo desde el parámetro de ruta, que llega como
   * `string | undefined`; el `transform` lo normaliza acá para que ninguna tenga
   * que convertirlo. Sin un id válido, la opción "Archivos" queda deshabilitada.
   */
  readonly documentoId = input<number | null, number | string | null | undefined>(null, {
    transform: toDocumentoId,
  });

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

  /**
   * Presencia del eje de aprobación (botón "Aprobar" + "Desaprobar" del
   * dropdown). Encendido por default —casi todo documento se aprueba—, se apaga
   * en los que el backend no aprueba, como las plantillas recurrentes: un botón
   * que solo sabe fallar no informa, estorba.
   */
  readonly showAprobacion = input<boolean>(true);

  /**
   * Presencia del botón "Imprimir". Encendido por default, se apaga donde el
   * documento no se imprime: las plantillas recurrentes no son un comprobante
   * —de ellas nacen las facturas, que sí se imprimen—, así que su PDF no existe.
   */
  readonly showImprimir = input<boolean>(true);

  readonly aprobar = output<void>();
  readonly desaprobar = output<void>();
  readonly imprimir = output<void>();
  readonly anular = output<void>();
  readonly emitir = output<void>();

  private readonly accionesMenu = viewChild.required<Menu>('accionesMenu');
  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  protected readonly archivosVisible = signal(false);

  /** Dueño de los archivos: el documento abierto. `null` mientras no hay id válido. */
  protected readonly archivosOwner = computed<ArchivoOwner | null>(() => {
    const id = this.documentoId();
    return id === null ? null : { modelo: MODELO.general.documento, objetoId: id };
  });

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
    const items: MenuItem[] = [];
    if (this.showAprobacion()) {
      items.push({
        label: a.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: !this.canDesaprobar(),
        command: () => this.desaprobar.emit(),
      });
    }
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
      disabled: !this.canArchivos() || this.archivosOwner() === null,
      command: () => this.archivosVisible.set(true),
    },
  ]);

  protected toggleAcciones(event: Event): void {
    this.accionesMenu().toggle(event);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }
}

/** Normaliza el id de documento a número; `null` si no es un id utilizable. */
function toDocumentoId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}
