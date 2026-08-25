import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { nombresInvalidos } from '@reddoc/core';
import { seguirIntentos } from './form-pending.state';

/**
 * Cuántos campos pendientes quedan en **esta** card, para su barra de título.
 *
 * El contador de la barra de acciones dice cuántos faltan en total; este dice
 * dónde. Scrolleando el formulario se ve qué card todavía tiene trabajo sin
 * abrir nada — es el mapa, no el índice.
 *
 * ```html
 * <div class="flex items-center gap-3 …">   <!-- barra de título de la card -->
 *   <h2>Seguridad social</h2>
 *   <lib-section-pending [form]="form" />
 * </div>
 * ```
 *
 * **Sin configuración:** sube al `<section>` que lo contiene y cuenta los
 * controles que viven dentro. La card ya sabe qué campos tiene — está en su
 * propio DOM—, así que no hay que declararlos otra vez.
 */
@Component({
  selector: 'lib-section-pending',
  standalone: true,
  template: `
    @if (intentado() && cantidad()) {
      <span
        class="ml-auto inline-flex shrink-0 items-center rounded-md border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold tabular-nums text-red-700"
        [attr.title]="titulo()"
        [attr.aria-label]="titulo()"
      >
        {{ cantidad() }}
      </span>
    }
  `,
  // El host desaparece de la caja: así la ficha es un flex item más de la barra
  // de título y su `ml-auto` la manda al extremo, sin envoltorio intermedio.
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPendingComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<FormGroup>();
  /** Texto del tooltip; `{n}` se reemplaza por la cantidad. */
  readonly titleTemplate = input<string>('{n} sin completar en esta sección');

  private readonly seccion = this.host.closest('section');
  private readonly estado = seguirIntentos(this.form, this.host.closest('form'), this.destroyRef);
  protected readonly intentado = this.estado.intentado;

  protected readonly cantidad = computed<number>(() => {
    this.estado.version();
    if (!this.intentado() || !this.seccion) return 0;
    const mios = new Set(
      Array.from(this.seccion.querySelectorAll('[formcontrolname]'), (el) =>
        el.getAttribute('formcontrolname'),
      ),
    );
    return nombresInvalidos(this.form()).filter((name) => mios.has(name)).length;
  });

  protected readonly titulo = computed(() =>
    this.titleTemplate().replace('{n}', String(this.cantidad())),
  );
}
