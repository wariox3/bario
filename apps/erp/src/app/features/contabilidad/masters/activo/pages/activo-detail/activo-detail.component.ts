import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, formatCop } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ActivoService } from '../../activo.service';
import { ACTIVO_LIST_PATH } from '../../activo.constants';
import type { Activo } from '../../activo.model';

@Component({
  selector: 'app-activo-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DatePipe, DetailHeaderComponent],
  templateUrl: './activo-detail.component.html',
  styleUrl: './activo-detail.component.scss',
})
export class ActivoDetailComponent implements OnInit {
  private readonly activoService = inject(ActivoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly formatCop = formatCop;

  readonly id = input<string>();

  protected readonly activo = signal<Activo | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Contabilidad → listado de activos → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const activo = this.activo();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.activo.name,
        routerLink: slug ? ['/t', slug, ...ACTIVO_LIST_PATH] : undefined,
      },
    ];
    if (activo) items.push({ label: activo.nombre });
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
    this.loadActivo(id);
  }

  protected onBack(): void {
    this.navigate(...ACTIVO_LIST_PATH);
  }

  protected onEdit(): void {
    const a = this.activo();
    if (!a) return;
    this.navigate(...ACTIVO_LIST_PATH, 'editar', a.id);
  }

  private loadActivo(id: number): void {
    this.activoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.activo.set(a);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.activo.detail.toasts;
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
