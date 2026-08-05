import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Estado de **acceso denegado** (403) para renderizar en el lugar del contenido.
 *
 * Un permiso denegado no es una falla del sistema: es una regla funcionando. Por
 * eso no va en rojo ni grita — usa el mismo idioma del estado vacío de las
 * tablas (ícono contenido, título navy, subtítulo muted) y se limita a decir qué
 * pasó y por dónde salir.
 *
 * El **motivo lo pone el backend**: `message` recibe su `detail` tal cual. El
 * front no inventa el porqué, solo lo enmarca; sin mensaje cae al texto genérico
 * del diccionario.
 *
 * Se usa dentro del recuadro que ocuparía la tabla, con el breadcrumb y el
 * sidebar intactos: el usuario sigue ubicado y puede irse sin usar el back.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <span
        class="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[rgba(20,48,73,0.06)]"
      >
        <i class="pi pi-lock text-[1.1rem] text-brand-navy" aria-hidden="true"></i>
      </span>

      <div class="flex flex-col gap-1">
        <p class="m-0 text-[0.95rem] font-bold text-brand-navy">{{ dict().title }}</p>
        <p class="m-0 max-w-[340px] text-[0.8rem] leading-relaxed text-brand-muted">
          {{ message() || dict().sub }}
        </p>
      </div>

      @if (backLink(); as link) {
        <a
          class="mt-1 rounded-lg border border-[rgba(20,48,73,0.12)] px-3.5 py-1.5 text-[0.8rem] font-medium text-brand-text no-underline transition-colors hover:bg-[rgba(20,48,73,0.04)]"
          [routerLink]="link"
        >
          {{ dict().back }}
        </a>
      }
    </div>
  `,
  host: { class: 'flex flex-1 items-center justify-center' },
})
export class AccessDeniedComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Motivo tal como lo mandó el backend. Vacío → texto genérico. */
  readonly message = input<string>('');

  /** Destino del botón de salida. Sin link, no se dibuja el botón. */
  readonly backLink = input<readonly string[] | null>(null);

  protected readonly dict = computed(() => this.i18n.t().common.accessDenied);
}
