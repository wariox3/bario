import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Fila de "no se pudo cargar" con su «Reintentar»: el mensaje a la izquierda y
 * el botón a la derecha (se apilan si no entran).
 *
 * Solo la fila: el recuadro lo pone quien la usa, porque a veces es el cuerpo
 * de una tarjeta y a veces la tarjeta entera.
 */
@Component({
  selector: 'app-estado-error',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="m-0 text-[0.8rem] text-red-600">{{ mensaje() }}</p>
      <p-button
        type="button"
        icon="pi pi-refresh"
        severity="secondary"
        [outlined]="true"
        [label]="reintentarLabel()"
        (onClick)="reintentar.emit()"
      />
    </div>
  `,
})
export class EstadoErrorComponent {
  readonly mensaje = input.required<string>();
  readonly reintentarLabel = input.required<string>();
  readonly reintentar = output<void>();
}
