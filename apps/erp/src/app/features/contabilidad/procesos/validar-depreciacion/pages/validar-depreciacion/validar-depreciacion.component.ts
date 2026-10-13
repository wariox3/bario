import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ValidarDepreciacionService } from '../../validar-depreciacion.service';

/** Fase de la consola: gobierna el estado de carga del botón. */
type ValidarStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Consola del proceso **Validar depreciación** de Contabilidad.
 *
 * Misma forma que Validar saldos de Cartera/Tesorería: `<lib-list-shell>` con un
 * panel centrado que explica el proceso y lo dispara. Pide confirmación porque
 * corrige la depreciación de todos los activos en bloque. El resultado se avisa
 * solo con un toast: la página no pinta lo corregido.
 */
@Component({
  selector: 'app-validar-depreciacion',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, ListShellComponent],
  templateUrl: './validar-depreciacion.component.html',
  styleUrl: './validar-depreciacion.component.scss',
  providers: [ConfirmationService],
})
export class ValidarDepreciacionComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ValidarDepreciacionService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly status = signal<ValidarStatus>('idle');

  /** Migas: Contabilidad (navegable) → este proceso. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      { label: this.t().entities.validarDepreciacion.name },
    ];
  });

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onValidar(): void {
    if (this.status() === 'running') return;

    const dict = this.t().entities.validarDepreciacion;
    this.confirmation.confirm({
      header: dict.confirm.header,
      // Recalcula desde el origen: corrige, no borra. Ícono informativo, no de alerta.
      icon: 'pi pi-info-circle',
      message: dict.confirm.message,
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-check',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.execute(),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private execute(): void {
    const dict = this.t().entities.validarDepreciacion;
    this.status.set('running');

    this.service
      .validar()
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
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
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
