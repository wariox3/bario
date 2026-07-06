import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { SedeService } from '../../sede.service';
import { SEDE_LIST_PATH } from '../../sede.constants';
import type { Sede } from '../../sede.model';

@Component({
  selector: 'app-sede-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './sede-detail.component.html',
  styleUrl: './sede-detail.component.scss',
})
export class SedeDetailComponent implements OnInit {
  private readonly service = inject(SedeService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly sede = signal<Sede | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo General → listado de sedes → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const sede = this.sede();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.general.name,
        routerLink: slug ? ['/t', slug, 'general'] : undefined,
      },
      {
        label: this.t().entities.sede.name,
        routerLink: slug ? ['/t', slug, ...SEDE_LIST_PATH] : undefined,
      },
    ];
    if (sede) items.push({ label: sede.nombre });
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
    this.loadSede(id);
  }

  protected onBack(): void {
    this.navigate(...SEDE_LIST_PATH);
  }

  protected onEdit(): void {
    const s = this.sede();
    if (!s) return;
    this.navigate(...SEDE_LIST_PATH, 'editar', s.id);
  }

  private loadSede(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.sede.set(s);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.sede.detail.toasts;
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
