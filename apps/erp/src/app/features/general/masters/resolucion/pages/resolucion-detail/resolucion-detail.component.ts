import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import { ActiveModuleStore } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ResolucionService } from '../../resolucion.service';
import type { Resolucion, ResolucionTipo } from '../../resolucion.model';

@Component({
  selector: 'app-resolucion-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DatePipe, DetailHeaderComponent],
  templateUrl: './resolucion-detail.component.html',
  styleUrl: './resolucion-detail.component.scss',
})
export class ResolucionDetailComponent implements OnInit {
  private readonly resolucionService = inject(ResolucionService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly resolucion = signal<Resolucion | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Módulo activo (venta/compra) del que cuelga esta resolución. */
  protected readonly tipo = computed<ResolucionTipo>(() =>
    this.activeModule.activeId() === 'compra' ? 'compra' : 'venta',
  );

  /** Migas: módulo (Venta/Compra) → listado de resoluciones → prefijo abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const tipo = this.tipo();
    const resolucion = this.resolucion();
    const moduleName =
      tipo === 'compra' ? this.t().modules.compra.name : this.t().modules.venta.name;
    const items: BreadcrumbItem[] = [
      { label: moduleName, routerLink: slug ? ['/t', slug, tipo] : undefined },
      {
        label: this.t().entities.resolucion.name,
        routerLink: slug ? ['/t', slug, tipo, 'resoluciones'] : undefined,
      },
    ];
    if (resolucion) items.push({ label: resolucion.prefijo });
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
    this.loadResolucion(id);
  }

  protected onBack(): void {
    this.navigate('resoluciones');
  }

  protected onEdit(): void {
    const r = this.resolucion();
    if (!r) return;
    this.navigate('resoluciones', 'editar', r.id);
  }

  private loadResolucion(id: number): void {
    this.resolucionService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.resolucion.set(r);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.resolucion.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, this.tipo(), ...subPath]);
  }
}
