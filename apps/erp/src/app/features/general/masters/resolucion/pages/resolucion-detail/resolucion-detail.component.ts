import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { I18nService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ActiveModuleStore, masterNav } from '@erp/core/erp-modules';
import { ResolucionService } from '../../resolucion.service';
import { RESOLUCION_SEGMENT } from '../../resolucion.constants';
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
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly nav = masterNav(RESOLUCION_SEGMENT);

  readonly id = input<string>();

  protected readonly resolucion = signal<Resolucion | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Módulo activo (venta/compra) del que cuelga esta resolución. */
  protected readonly tipo = computed<ResolucionTipo>(() =>
    this.activeModule.activeId() === 'compra' ? 'compra' : 'venta',
  );

  /** Migas: módulo activo → listado de resoluciones → prefijo abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const resolucion = this.resolucion();
    return this.nav.crumbs(
      this.t().entities.resolucion.name,
      ...(resolucion ? [{ label: resolucion.prefijo }] : []),
    );
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
    this.nav.ir();
  }

  protected onEdit(): void {
    const r = this.resolucion();
    if (!r) return;
    this.nav.ir('editar', r.id);
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
}
