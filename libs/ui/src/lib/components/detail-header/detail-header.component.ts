import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Encabezado estándar de las páginas de detalle (ficha de identidad).
 *
 * Patrón: ícono redondo + `eyebrow` (tipo de entidad) + `title` (identidad real
 * del registro) + subtítulo opcional proyectado (`[detailHeaderSubtitle]`).
 * Para fichas con medio especial (monograma de iniciales, imagen) se proyecta
 * vía `[detailHeaderMedia]` en lugar de pasar `icon`. El slot
 * `[detailHeaderActions]` queda a la derecha para badges/acciones.
 *
 * Reemplaza el header copy-paste de cada `*-detail`. Mantiene `items-center`
 * para que el bloque de texto quede alineado con el ícono aunque solo haya
 * eyebrow + título.
 */
@Component({
  selector: 'lib-detail-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="overflow-hidden rounded-xl border border-[rgba(20,48,73,0.1)] bg-brand-surface">
      <div class="flex flex-wrap items-center gap-4 px-5 py-5 max-[576px]:px-4">
        @if (icon(); as iconClass) {
          <span
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[1.4rem] text-sky-700"
          >
            <i [class]="iconClass"></i>
          </span>
        }
        <ng-content select="[detailHeaderMedia]" />

        <div class="flex min-w-0 flex-1 flex-col gap-1">
          @if (eyebrow(); as label) {
            <span class="text-[0.7rem] font-semibold uppercase tracking-wide text-brand-muted">
              {{ label }}
            </span>
          }
          <h1 class="m-0 truncate text-2xl font-bold tracking-tight text-brand-text">
            {{ title() }}
          </h1>
          <ng-content select="[detailHeaderSubtitle]" />
        </div>

        <ng-content select="[detailHeaderActions]" />
      </div>
    </section>
  `,
})
export class DetailHeaderComponent {
  /** Clase del PrimeIcon (ej. `'pi pi-file-edit'`). Se omite si se proyecta media. */
  readonly icon = input<string>();
  /** Etiqueta superior con el tipo de entidad (ej. `'Resolución'`). */
  readonly eyebrow = input<string>();
  /** Identidad real del registro (ej. `'FE 18760000001'`). */
  readonly title = input.required<string>();
}
