import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Invitación de un inicio de módulo: "hay algo disponible para tu empresa".
 *
 * Tira horizontal, no card de empty-state centrada: quien entra a un módulo
 * viene a trabajar, no a hacer onboarding. Chip de ícono + copy a la izquierda
 * y las acciones (proyectadas) a la derecha se leen en una barrida y dejan
 * libre el resto del inicio para lo que venga después.
 *
 * La comparten los inicios de Venta (facturación electrónica) y General
 * (asistente de datos iniciales): una sola familia visual, cada uno con su ícono
 * y su copy. Las acciones se proyectan (`<ng-content>`), así uno mete un botón y
 * el otro dos sin que la tira sepa nada de sus dominios.
 *
 * Idioma de las fichas del ERP (borders-only, chip sky, radius 12px) — nada de
 * banda de alerta: no hay nada roto. Lo que le da cuerpo no es estructura sino
 * **atmósfera**, tres capas decorativas navy/sky a opacidad de susurro que
 * reemplazan a las ilustraciones SVG del legacy sin sumar assets:
 *  1. grilla de puntos que se desvanece desde la derecha — celdas de una tabla
 *     esperando datos, la imagen del ERP;
 *  2. halo sky en la esquina superior derecha — el acento de marca como luz;
 *  3. el ícono del dominio como marca de agua sangrando por la esquina.
 */
@Component({
  selector: 'app-inicio-invitacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="relative overflow-hidden rounded-xl border border-[rgba(20,48,73,0.1)] bg-brand-surface animate-fade-up"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-[radial-gradient(circle,rgba(20,48,73,0.16)_1px,transparent_1.6px)] bg-[size:14px_14px] [mask-image:linear-gradient(to_left,rgba(0,0,0,0.85),transparent)]"
      ></div>
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -top-16 -right-10 h-56 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(119,170,215,0.22),transparent)]"
      ></div>
      <i
        aria-hidden="true"
        class="pi {{
          icon()
        }} pointer-events-none absolute -right-3 -bottom-7 -rotate-[10deg] text-[7.5rem] text-[rgba(20,48,73,0.05)]"
      ></i>

      <div class="relative flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-sky-50 text-sky-700"
        >
          <i class="pi {{ icon() }} text-[1rem]" aria-hidden="true"></i>
        </span>

        <div class="min-w-[15rem] flex-1">
          <h2 class="m-0 text-[0.9rem] font-bold tracking-tight text-brand-text">{{ title() }}</h2>
          <p class="m-0 mt-0.5 text-[0.8rem] leading-relaxed text-brand-muted">{{ desc() }}</p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <ng-content />
        </div>
      </div>
    </section>
  `,
})
export class InicioInvitacionComponent {
  /** Clase `pi-*` del dominio: va en el chip y como marca de agua. */
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly desc = input.required<string>();
}
