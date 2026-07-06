import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, formatCop } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { AdicionalService } from '../../adicional.service';
import { ADICIONAL_LIST_PATH } from '../../adicional.constants';
import type { Adicional } from '../../adicional.model';

@Component({
  selector: 'app-adicional-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './adicional-detail.component.html',
  styleUrl: './adicional-detail.component.scss',
})
export class AdicionalDetailComponent implements OnInit {
  private readonly adicionalService = inject(AdicionalService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly formatCop = formatCop;

  readonly id = input<string>();

  protected readonly adicional = signal<Adicional | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Humano → listado de adicionales → contrato abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const adicional = this.adicional();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.adicional.name,
        routerLink: slug ? ['/t', slug, ...ADICIONAL_LIST_PATH] : undefined,
      },
    ];
    if (adicional) items.push({ label: adicional.contrato_nombre ?? '' });
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
    this.loadAdicional(id);
  }

  protected onBack(): void {
    this.navigate(...ADICIONAL_LIST_PATH);
  }

  protected onEdit(): void {
    const a = this.adicional();
    if (!a) return;
    this.navigate(...ADICIONAL_LIST_PATH, 'editar', a.id);
  }

  private loadAdicional(id: number): void {
    this.adicionalService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.adicional.set(a);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.adicional.detail.toasts;
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
