import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
} from '@angular/core';

/**
 * Ancestro que scrollea, contra cuyo tope se mide si la barra quedó pegada.
 * `null` ⇒ ninguno, y se cae al viewport. Se busca subiendo por el DOM en vez de
 * apuntar a un selector del layout para que el componente sirva en cualquiera.
 */
function scrollParentDe(el: HTMLElement): HTMLElement | null {
  for (let nodo = el.parentElement; nodo; nodo = nodo.parentElement) {
    const { overflowY } = getComputedStyle(nodo);
    if (overflowY === 'auto' || overflowY === 'scroll') return nodo;
  }
  return null;
}

/**
 * Barra de acciones de una página (volver / guardar / editar…).
 *
 * Se pega bajo el header al hacer scroll y **solo entonces** se viste de chrome
 * —fondo y filete—; en reposo es una fila de botones más. En un formulario
 * largo, guardar no puede quedar arriba fuera de vista.
 *
 * ```html
 * <lib-page-actions>
 *   <p-button [label]="…" (onClick)="onCancel()" />
 *   <p-button type="submit" [label]="…" />
 * </lib-page-actions>
 * ```
 *
 * El contenido proyectado queda dentro del `<form>` en el DOM real, así que un
 * botón `type="submit"` sigue enviando el formulario.
 *
 * **La caja no cambia nunca.** El fondo lo pinta un `::before` que se desborda
 * por fuera; si en cambio apareciera padding al pegarse, la página entera
 * saltaría y el pegado podría entrar en bucle (crece → deja de estar pegada →
 * encoge → vuelve a pegarse).
 *
 * **El sangrado lateral sale de `--page-gutter`**, que cada layout declara sobre
 * su scrollport con el mismo valor que su padding — así la banda llega a los
 * bordes en vez de leerse como una tarjeta flotando, sin que este componente
 * sepa nada de ningún layout ni repita sus breakpoints.
 *
 * **El scrollport no debe llevar `padding-top`.** Los navegadores no acuerdan
 * desde dónde ancla un sticky cuando su scrollport tiene padding superior:
 * Gecko lo suma al `top`, Blink/WebKit no. El layout aporta el gutter de arriba
 * como espaciador en el flujo (un `::before` del scrollport con la altura del
 * gutter) y así todos los navegadores anclan la barra en la línea del header,
 * que es también lo que asume el umbral de detección.
 *
 * **El aire sale de `--page-actions-air`**, que alimenta a la vez el `top` del
 * sticky, el desborde vertical de la banda y el umbral de detección: los tres se
 * mueven juntos porque son el mismo valor.
 */
@Component({
  selector: 'lib-page-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: `
    :host {
      --page-actions-air: 0.5rem;

      position: sticky;
      top: var(--page-actions-air);
      z-index: 30; // bajo el header del layout (50), sobre las cards
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    // La banda: desbordada el aire arriba/abajo y el gutter del layout a los
    // lados. Va detrás del contenido, dentro del stacking context que ya crea el
    // sticky, así que el z-index negativo no se escapa hacia atrás.
    :host::before {
      content: '';
      position: absolute;
      inset: calc(var(--page-actions-air) * -1) calc(var(--page-gutter, 1.75rem) * -1);
      z-index: -1;
      background: var(--color-brand-surface, #fff);
      border-bottom: 1px solid rgba(19 38 60 / 0.08);
      opacity: 0;
      transition: opacity 0.16s ease;
      pointer-events: none;
    }

    :host(.is-stuck)::before {
      opacity: 1;
    }
  `,
})
export class PageActionsComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.vigilarPegado());
  }

  /**
   * Marca la barra mientras está pegada. Todavía no hay selector CSS de "sticky
   * pegado" con soporte real (`scroll-state(stuck)` es demasiado nuevo), así que
   * se compara su posición contra el tope del scrollport.
   *
   * No usar el truco del `IntersectionObserver` con `threshold: [1]`: ese umbral
   * exige que el ratio vuelva a valer 1 **exacto** y con posiciones fraccionarias
   * se queda en 0.999…, así que detecta el pegado pero nunca el despegado.
   *
   * La clase se aplica a mano y no por binding a propósito: esto corre en cada
   * evento de scroll y no vale la pena despertar la detección de cambios para
   * alternar una clase en el propio host.
   */
  private vigilarPegado(): void {
    const barra = this.host.nativeElement;
    const contenedor = scrollParentDe(barra);
    const fuente: HTMLElement | Window = contenedor ?? window;

    // El aire lo declara el CSS; leerlo de ahí evita tener el mismo número en
    // dos sitios. Se relee al redimensionar por si un breakpoint lo cambia.
    let aire = 0;
    const medirAire = (): void => {
      aire = parseFloat(getComputedStyle(barra).top) || 0;
    };

    const evaluar = (): void => {
      const tope = contenedor ? contenedor.getBoundingClientRect().top : 0;
      // Media décima de tolerancia: pegada, la barra queda exactamente en
      // `tope + aire`, pero el layout fraccionario puede dejarla un pelo abajo.
      const pegada = barra.getBoundingClientRect().top <= tope + aire + 0.5;
      barra.classList.toggle('is-stuck', pegada);
    };

    const alRedimensionar = (): void => {
      medirAire();
      evaluar();
    };

    medirAire();
    evaluar();
    fuente.addEventListener('scroll', evaluar, { passive: true });
    window.addEventListener('resize', alRedimensionar, { passive: true });
    this.destroyRef.onDestroy(() => {
      fuente.removeEventListener('scroll', evaluar);
      window.removeEventListener('resize', alRedimensionar);
    });
  }
}
