import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import type { CarteraTipo } from '@erp/core/module-config';
import { ValidarSaldosService } from '../../validar-saldos.service';

/** Módulo que monta el proceso para cada cartera: sus migas apuntan ahí. */
const MODULO_POR_TIPO = {
  cobrar: 'cartera',
  pagar: 'tesoreria',
} as const satisfies Record<CarteraTipo, string>;

/** Fase de la consola: gobierna el estado de carga del botón. */
type ValidarStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Consola del proceso **Validar saldos**, compartida por Cartera (`cobrar`) y
 * Tesorería (`pagar`): cada módulo la monta con su `tipo` en la ruta.
 *
 * Misma forma que los demás procesos de una sola acción (`RegenerarAfectado`):
 * `<lib-list-shell>` con un panel centrado que explica el proceso y lo dispara.
 * Pide confirmación porque corrige saldos en bloque. El resultado se avisa solo
 * con un toast: la página no pinta lo corregido.
 */
@Component({
  selector: 'app-validar-saldos',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, ListShellComponent],
  templateUrl: './validar-saldos.component.html',
  styleUrl: './validar-saldos.component.scss',
  providers: [ConfirmationService],
})
export class ValidarSaldosComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ValidarSaldosService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Cartera a validar; llega de la `data` de la ruta (`validarSaldosRoutes`). */
  readonly tipo = input<CarteraTipo>('cobrar');

  /** Textos que cambian según la cartera (cuentas por cobrar / por pagar). */
  protected readonly textos = computed(() => this.t().entities.validarSaldos.porTipo[this.tipo()]);

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly status = signal<ValidarStatus>('idle');

  /** Migas: módulo de la cartera (navegable) → este proceso. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const modulo = MODULO_POR_TIPO[this.tipo()];
    return [
      {
        label: this.t().modules[modulo].name,
        routerLink: slug ? ['/t', slug, modulo] : undefined,
      },
      { label: this.t().entities.validarSaldos.name },
    ];
  });

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onValidar(): void {
    if (this.status() === 'running') return;

    const dict = this.t().entities.validarSaldos;
    this.confirmation.confirm({
      header: dict.confirm.header,
      // Recalcula desde el origen: corrige, no borra. Ícono informativo, no de alerta.
      icon: 'pi pi-info-circle',
      message: this.textos().confirmMessage,
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-check',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.execute(),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private execute(): void {
    const dict = this.t().entities.validarSaldos;
    this.status.set('running');

    this.service
      .validar(this.tipo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          // Un `ejecutado: false` es un fallo aunque la petición haya respondido 200.
          if (!res.ejecutado) {
            this.status.set('error');
            this.toast.error(dict.toasts.error.title, dict.toasts.error.desc);
            return;
          }
          this.status.set('success');
          this.toast.success(dict.toasts.success.title, this.textos().successDesc);
        },
        error: (err: unknown) => {
          this.status.set('error');
          this.toast.error(
            dict.toasts.error.title,
            extractErrorMessage(err, dict.toasts.error.desc),
          );
        },
      });
  }
}
