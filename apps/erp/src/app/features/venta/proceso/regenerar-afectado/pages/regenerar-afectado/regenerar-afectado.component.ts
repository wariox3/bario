import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { RegenerarAfectadoService } from '../../regenerar-afectado.service';
import { pickAfectadosCount, type RegenerarAfectadoResult } from '../../regenerar-afectado.model';

/** Fase de la consola: gobierna botón, panel de resultado y feedback. */
type RegenerarStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Consola del proceso **Regenerar afectado**.
 *
 * Página de una sola acción dentro del shell de listas (`<lib-list-shell>`):
 * breadcrumb + card con el título en su header, igual que los listados. Como no
 * hay tabla, el área de contenido aloja un panel de acción centrado que explica
 * el recálculo, pide confirmación (muta datos en masa) y dispara
 * `POST .../regenerar-afectado/`. Al terminar muestra el resultado con el conteo
 * (si el backend lo devuelve) y un enlace al informe "Pendiente por facturar",
 * que es lo que este proceso mantiene consistente.
 */
@Component({
  selector: 'app-regenerar-afectado',
  standalone: true,
  imports: [RouterLink, ButtonModule, ConfirmDialogModule, ListShellComponent],
  templateUrl: './regenerar-afectado.component.html',
  styleUrl: './regenerar-afectado.component.scss',
  providers: [ConfirmationService],
})
export class RegenerarAfectadoComponent {
  // ── Colaboradores ─────────────────────────────────────────────────────────
  private readonly service = inject(RegenerarAfectadoService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado ────────────────────────────────────────────────────────────────
  protected readonly status = signal<RegenerarStatus>('idle');
  protected readonly result = signal<RegenerarAfectadoResult | null>(null);

  /** Conteo mostrable extraído del response, o `null` si no vino ninguno. */
  protected readonly affectedCount = computed(() => pickAfectadosCount(this.result()));

  /** Migas: módulo Venta (navegable) → este proceso. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.venta.name,
        routerLink: slug ? ['/t', slug, 'venta'] : undefined,
      },
      { label: this.t().entities.regenerarAfectado.name },
    ];
  });

  /** Ruta del informe que este proceso alimenta (enlace del panel de éxito). */
  protected readonly informeLink = computed<readonly unknown[]>(() => {
    const slug = this.tenant.currentSlug();
    return slug
      ? ['/t', slug, 'venta', 'informes', 'pendiente-facturar']
      : ['/', 'venta', 'informes', 'pendiente-facturar'];
  });

  // ── Handlers del template ─────────────────────────────────────────────────

  protected onRegenerar(): void {
    if (this.status() === 'running') return;

    const dict = this.t().entities.regenerarAfectado;
    this.confirmation.confirm({
      header: dict.confirm.header,
      // No es destructivo (recálculo idempotente): ícono informativo, no de alerta.
      icon: 'pi pi-info-circle',
      message: dict.confirm.message,
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-sync',
      // Jerarquía visual: "Regenerar" primario (relleno) vs "Cancelar" quieto
      // (outlined secundario) — así los dos botones no salen del mismo color.
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.execute(),
    });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private execute(): void {
    const dict = this.t().entities.regenerarAfectado;
    this.status.set('running');

    this.service
      .regenerar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.status.set('success');
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
        },
        error: (err: unknown) => {
          this.result.set(null);
          this.status.set('error');
          this.toast.error(
            dict.toasts.error.title,
            extractErrorMessage(err, dict.toasts.error.desc),
          );
        },
      });
  }
}
