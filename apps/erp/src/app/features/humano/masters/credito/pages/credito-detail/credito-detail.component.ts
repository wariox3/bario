import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, formatCop } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { CreditoService } from '../../credito.service';
import { CREDITO_LIST_PATH } from '../../credito.constants';
import type { Credito } from '../../credito.model';

@Component({
  selector: 'app-credito-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DatePipe, DetailHeaderComponent],
  templateUrl: './credito-detail.component.html',
  styleUrl: './credito-detail.component.scss',
})
export class CreditoDetailComponent implements OnInit {
  private readonly creditoService = inject(CreditoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly formatCop = formatCop;

  readonly id = input<string>();

  protected readonly credito = signal<Credito | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Humano → listado de créditos → contrato abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const credito = this.credito();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.credito.name,
        routerLink: slug ? ['/t', slug, ...CREDITO_LIST_PATH] : undefined,
      },
    ];
    if (credito) items.push({ label: credito.contrato_nombre ?? '' });
    return items;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadCredito(id);
  }

  protected onBack(): void {
    this.navigate(...CREDITO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.credito();
    if (!c) return;
    this.navigate(...CREDITO_LIST_PATH, 'editar', c.id);
  }

  private loadCredito(id: number): void {
    this.creditoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.credito.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.credito.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...subPath]);
  }
}
