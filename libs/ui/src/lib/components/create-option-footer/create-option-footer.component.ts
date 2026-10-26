import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Pie «+ Crear …» del panel de sugerencias de un autocomplete (alta inline de un
 * master). Va dentro del `<ng-template #footer>` del `p-autocomplete`:
 *
 * ```html
 * <ng-template #footer>
 *   <lib-create-option-footer [label]="createLabel()" (create)="onCreateClick()" />
 * </ng-template>
 * ```
 *
 * El `preventDefault` del `mousedown` evita que el input pierda el foco antes de
 * que llegue el `click`: sin él, el blur dispararía la reconciliación de
 * `forceSelection` y el panel se cerraría bajo el puntero.
 *
 * Lo usan `lib-contacto-select` («Crear tercero») y `app-item-autocomplete`
 * («Crear ítem»); el alta en sí es siempre de quien escucha `create`.
 */
@Component({
  selector: 'lib-create-option-footer',
  standalone: true,
  template: `
    <button
      type="button"
      class="flex w-full items-center gap-2 border-t border-[rgba(20,48,73,0.08)] px-3 py-2 text-[0.8rem] font-medium text-sky-700 transition-colors hover:bg-sky-50"
      (mousedown)="$event.preventDefault()"
      (click)="create.emit()"
    >
      <i class="pi pi-plus text-[0.7rem]"></i>
      {{ label() }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOptionFooterComponent {
  readonly label = input.required<string>();
  readonly create = output<void>();
}
