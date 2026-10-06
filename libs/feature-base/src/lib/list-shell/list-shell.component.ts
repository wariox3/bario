import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import type { BreadcrumbItem } from '../breadcrumb/breadcrumb.types';

/**
 * Shell de página de listado: breadcrumb + título suelto y **un solo recuadro**
 * con la botonera como cabecera y la tabla debajo. Sin card envolvente: card →
 * recuadro → tabla eran tres marcos anidados para una sola pieza.
 *
 * Es "tonto" como el resto de building blocks: recibe `breadcrumb`/`title` y
 * **proyecta** la botonera y la tabla por slots. No conoce HTTP ni dominio; cada
 * página le pasa su `<lib-data-toolbar toolbar>` y `<lib-data-table table>` ya
 * configurados, y deja sus modales (filtros, confirm, import) fuera del shell por
 * ser overlays. El total de registros lo muestra el paginador de la tabla.
 *
 * ```html
 * <lib-list-shell [breadcrumb]="breadcrumbItems()" [title]="...">
 *   <lib-data-toolbar toolbar ... />
 *   <lib-data-table   table   ... />
 * </lib-list-shell>
 * ```
 *
 * El slot `toolbar` admite el `<lib-data-toolbar>` tal cual (trae su padding y su
 * divisor) o un contenedor propio —filtros + botones de una utilidad, panel de
 * parámetros de un informe—, al que el shell le da el divisor y, si es un `div`,
 * también el padding.
 */
@Component({
  selector: 'lib-list-shell',
  standalone: true,
  imports: [BreadcrumbComponent],
  templateUrl: './list-shell.component.html',
  styleUrl: './list-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListShellComponent {
  /** Trail de migajas ya traducido; se delega al `<lib-breadcrumb>` interno. */
  readonly breadcrumb = input.required<readonly BreadcrumbItem[]>();
  /** Título de la lista (ya traducido por el host). */
  readonly title = input.required<string>();
}
