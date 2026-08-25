import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { describirCampo, irAlCampo, nombresInvalidos, type PendingField } from '@reddoc/core';
import { seguirIntentos } from './form-pending.state';

/** Textos del contador. Se pueden sobreescribir para i18n, igual que `<lib-field-error>`. */
export interface FormPendingLabels {
  readonly singular: string;
  readonly plural: string;
  readonly title: string;
}

const TEXTOS: FormPendingLabels = {
  singular: 'pendiente',
  plural: 'pendientes',
  title: 'Falta completar',
};

/** Un grupo del listado: los pendientes de una misma card. */
interface GrupoPendiente {
  readonly section: string;
  readonly campos: readonly PendingField[];
}

/**
 * Contador de campos obligatorios pendientes, para la barra de acciones.
 *
 * Vive **dentro** de `<lib-page-actions>`, que es lo único del formulario que
 * queda siempre a la vista al scrollear: es donde la persona acaba de presionar
 * guardar y donde va a mirar cuando no pase nada.
 *
 * ```html
 * <lib-page-actions>
 *   <p-button type="submit" … />
 *   <lib-form-pending [form]="form" />
 * </lib-page-actions>
 * ```
 *
 * **Callado hasta el primer intento.** Anunciar "faltan 21" en un alta recién
 * abierta es regañar a alguien que todavía no hizo nada. Aparece cuando el
 * submit se va en blanco y de ahí en más **cuenta hacia atrás** mientras
 * completan: 3 → 2 → 1 → desaparece. Es progreso, no reproche.
 *
 * **Cero cableado.** El intento se detecta escuchando el `submit` del `<form>`
 * que lo contiene, y las etiquetas salen del `<label>` de cada campo. El
 * formulario no declara nada más que su `FormGroup`.
 */
@Component({
  selector: 'lib-form-pending',
  standalone: true,
  template: `
    @if (intentado() && pendientes().length) {
      <div class="relative">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.06)] px-2 py-1 text-[0.72rem] font-medium text-red-700 transition-colors hover:bg-[rgba(220,38,38,0.1)]"
          aria-haspopup="true"
          [attr.aria-expanded]="abierto()"
          aria-controls="lib-form-pending-panel"
          (click)="alternar($event)"
        >
          <i class="pi pi-exclamation-circle text-[0.75rem]" aria-hidden="true"></i>
          <span class="font-mono font-semibold tabular-nums">{{ pendientes().length }}</span>
          <span>{{ pendientes().length === 1 ? textos().singular : textos().plural }}</span>
        </button>

        @if (abierto()) {
          <div
            id="lib-form-pending-panel"
            role="menu"
            class="lib-form-pending__panel absolute left-0 top-[calc(100%+8px)] z-[60] max-h-[min(60vh,24rem)] w-[17rem] overflow-y-auto rounded-[10px] border border-[rgba(19,38,60,0.08)] bg-white py-2 shadow-[0_10px_30px_rgba(19,38,60,0.1)]"
          >
            @for (grupo of agrupados(); track grupo.section) {
              @if (grupo.section) {
                <p
                  class="px-3 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-brand-muted opacity-70"
                >
                  {{ grupo.section }}
                </p>
              }
              @for (campo of grupo.campos; track campo.name) {
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8rem] text-brand-text transition-colors hover:bg-[rgba(19,38,60,0.04)]"
                  (click)="ir(campo.name)"
                >
                  <span class="h-1 w-1 shrink-0 rounded-full bg-red-500" aria-hidden="true"></span>
                  <span class="min-w-0 flex-1 truncate">{{ campo.label }}</span>
                </button>
              }
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    // El host desaparece de la caja: la ficha queda como un flex item más de la
    // barra de acciones, y en reposo (sin pendientes) no ocupa ni un hueco.
    :host {
      display: contents;
    }
    .lib-form-pending__panel {
      animation: lib-form-pending-in 0.12s ease-out;
    }
    @keyframes lib-form-pending-in {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPendingComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<FormGroup>();
  readonly textos = input<FormPendingLabels>(TEXTOS);

  protected readonly abierto = signal(false);

  /**
   * El `<form>` que contiene la barra. `<lib-page-actions>` proyecta su
   * contenido dentro del `<form>` real, así que subir por el DOM lo encuentra
   * sin que la página tenga que pasarlo.
   */
  private readonly formulario = this.host.closest('form');

  private readonly estado = seguirIntentos(this.form, this.formulario, this.destroyRef, () =>
    this.irAlPrimero(),
  );
  protected readonly intentado = this.estado.intentado;

  protected readonly pendientes = computed<readonly PendingField[]>(() => {
    this.estado.version();
    if (!this.intentado()) return [];
    const raiz = this.formulario ?? this.host.ownerDocument;
    return nombresInvalidos(this.form()).map((name) => describirCampo(raiz, name));
  });

  /** El listado se agrupa por card para que coincida con lo que se ve al scrollear. */
  protected readonly agrupados = computed<readonly GrupoPendiente[]>(() => {
    const grupos: { section: string; campos: PendingField[] }[] = [];
    for (const campo of this.pendientes()) {
      const section = campo.section ?? '';
      const ultimo = grupos.at(-1);
      if (ultimo && ultimo.section === section) ultimo.campos.push(campo);
      else grupos.push({ section, campos: [campo] });
    }
    return grupos;
  });

  protected alternar(event: MouseEvent): void {
    event.stopPropagation();
    this.abierto.update((o) => !o);
  }

  protected ir(name: string): void {
    this.abierto.set(false);
    irAlCampo(this.formulario ?? this.host.ownerDocument, name);
  }

  @HostListener('document:click', ['$event'])
  protected alClicFuera(event: Event): void {
    if (!this.abierto()) return;
    const target = event.target;
    if (target instanceof Node && this.host.contains(target)) return;
    this.abierto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    this.abierto.set(false);
  }

  /**
   * Tras un intento en blanco, lleva a la persona al primer pendiente sin que
   * tenga que buscarlo. El contador queda para los que siguen.
   */
  private irAlPrimero(): void {
    const primero = this.pendientes()[0];
    if (primero) irAlCampo(this.formulario ?? this.host.ownerDocument, primero.name);
  }
}
