import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * El cuerpo de una card cuando no hay nada que listar: falló la carga, o no hay datos.
 *
 * Es **tonto** y sin HTTP: quien lo usa decide qué texto va y qué hace el botón. Existe
 * porque las cards de seguridad pintaban este bloque calcado —mismo ícono en contenedor,
 * mismo par título/descripción, mismo "Reintentar"— y la tercera copia ya era descuido.
 *
 * NO cubre el estado de carga: cada card tiene su propio esqueleto, con la forma de las
 * filas que va a mostrar. Unificar eso pediría configurarlo tanto que saldría peor.
 */
@Component({
  selector: 'app-card-estado',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './card-estado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardEstadoComponent {
  /** Glifo del contenedor. `pi pi-exclamation-triangle` para errores, otro para vacíos. */
  readonly icono = input.required<string>();
  readonly titulo = input.required<string>();
  /** Segunda línea. `null` cuando el título ya lo dice todo. */
  readonly descripcion = input<string | null>(null);
  /** Etiqueta del botón. Sin esto no hay acción: un vacío no siempre tiene salida. */
  readonly accion = input<string | null>(null);
  readonly iconoAccion = input('pi pi-refresh');

  readonly accionar = output<void>();
}
