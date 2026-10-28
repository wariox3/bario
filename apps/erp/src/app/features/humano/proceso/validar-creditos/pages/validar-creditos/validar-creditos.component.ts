import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ValidarCreditosService } from '../../validar-creditos.service';

/** Fase de la consola: gobierna el estado de carga del botón. */
type ValidarStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Consola del proceso **Validar créditos** de Humano.
 *
 * Misma forma que Validar saldos de Cartera/Tesorería: `<lib-list-shell>` con un
 * panel centrado que explica el proceso y lo dispara. Pide confirmación porque
 * corrige los saldos de todos los créditos en bloque. El resultado se avisa solo
 * con un toast, que dice cuántos créditos se corrigieron.
 */
@Component({
  selector: 'app-validar-creditos',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, ListShellComponent],
  templateUrl: './validar-creditos.component.html',
  styleUrl: './validar-creditos.component.scss',
  providers: [ConfirmationService],
})
export class ValidarCreditosComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(ValidarCreditosService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly status = signal<ValidarStatus>('idle');

  /** Migas: Humano (navegable) → este proceso. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      { label: this.t().entities.validarCreditos.name },
    ];
  });

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onValidar(): void {
    if (this.status() === 'running') return;

    const dict = this.t().entities.validarCreditos;
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
    const dict = this.t().entities.validarCreditos;
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
          this.toast.success(dict.toasts.success.title, this.successDesc(res.corregidos));
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

  /** Detalle del toast según cuántos créditos se corrigieron (genérico si no vino). */
  private successDesc(corregidos: number | undefined): string {
    const desc = this.t().entities.validarCreditos.toasts.success.desc;
    if (corregidos === undefined) return desc.generic;
    if (corregidos === 0) return desc.zero;
    if (corregidos === 1) return desc.one;
    return desc.other.replace('{n}', String(corregidos));
  }
}
