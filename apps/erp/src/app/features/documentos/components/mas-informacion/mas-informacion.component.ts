import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  type OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroupDirective } from '@angular/forms';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

let siguienteId = 0;

/**
 * "Más información" de un documento: el colapsable al pie de la card de la
 * cabecera con los campos opcionales que menos se tocan (comentario, orden de
 * compra, remisión, asesor…). Plegado cuesta una línea y no empuja hacia abajo la
 * card de líneas. Es el "Más información" del ERP anterior, que allá era una
 * pestaña junto a Detalles.
 *
 * ```html
 * <app-mas-informacion [campos]="['orden_compra', 'comentario']">
 *   <div class="grid …">…campos…</div>
 * </app-mas-informacion>
 * ```
 *
 * Va dentro del `<form>`: al intentar guardar, si alguno de sus `campos` es
 * inválido se abre solo, antes de que `libFocusInvalid` busque el primer campo
 * con error (lo hace tras el siguiente render). Plegado, el contenido queda en el
 * DOM con `hidden`: los controles siguen vivos y el foco los alcanza al abrir.
 */
@Component({
  selector: 'app-mas-informacion',
  standalone: true,
  host: { class: 'block' },
  templateUrl: './mas-informacion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasInformacionComponent implements OnInit {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;
  private readonly formDirective = inject(FormGroupDirective, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Nombres de los controles que viven adentro: los que lo abren al fallar. */
  readonly campos = input<readonly string[]>([]);

  /** Desplegado. Arranca plegado; la página puede abrirlo (`[(abierto)]`). */
  readonly abierto = model(false);

  protected readonly panelId = `mas-informacion-${++siguienteId}`;

  ngOnInit(): void {
    this.formDirective?.ngSubmit.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const form = this.formDirective?.form;
      if (!form || form.valid) return;
      if (this.campos().some((nombre) => form.get(nombre)?.invalid)) this.abierto.set(true);
    });
  }
}
