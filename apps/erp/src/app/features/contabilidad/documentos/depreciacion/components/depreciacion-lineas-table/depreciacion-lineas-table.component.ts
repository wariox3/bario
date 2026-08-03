import { Component, computed, inject, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { I18nService, formatCop } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { DepreciacionLineaView } from '../../depreciacion-linea.model';
import { sumarLineasDepreciacion } from '../../depreciacion-linea.mapper';

/** Columnas fijas: nº, activo, código, nombre, días y valor. */
const BASE_COLUMN_COUNT = 6;

/**
 * Tabla **tonta** de las líneas de una depreciación: un activo fijo por fila con
 * sus días depreciados y el valor que calculó el backend.
 *
 * Es de solo lectura por naturaleza —las líneas las genera `cargar-activo/`, no
 * el usuario—, así que no compone controles de formulario. La única acción es
 * eliminar una fila, y va opt-in (`canDelete`): la ficha de detalle monta la
 * misma tabla sin ella.
 *
 * Cierra con una fila de total, que es el dato que el formulario manda en la
 * cabecera.
 */
@Component({
  selector: 'app-depreciacion-lineas-table',
  standalone: true,
  imports: [TooltipModule],
  templateUrl: './depreciacion-lineas-table.component.html',
  styleUrl: './depreciacion-lineas-table.component.scss',
})
export class DepreciacionLineasTableComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Líneas a renderizar (read ya mapeado a la forma del front). */
  readonly lines = input.required<readonly DepreciacionLineaView[]>();

  /** Muestra la columna de acciones con el botón de eliminar. */
  readonly canDelete = input<boolean>(false);

  /** Pide eliminar una línea; el padre confirma y persiste. */
  readonly remove = output<DepreciacionLineaView>();

  protected readonly formatMoney = formatCop;

  /** Total depreciado: la suma de las líneas. */
  protected readonly total = computed(() => sumarLineasDepreciacion(this.lines()));

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(() => BASE_COLUMN_COUNT + (this.canDelete() ? 1 : 0));
}
