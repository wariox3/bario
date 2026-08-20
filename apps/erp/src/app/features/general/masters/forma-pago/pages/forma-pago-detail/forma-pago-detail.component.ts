import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { FormaPagoService } from '../../forma-pago.service';
import { FORMA_PAGO_LIST_PATH } from '../../forma-pago.constants';
import type { FormaPago } from '../../forma-pago.model';

@Component({
  selector: 'app-forma-pago-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './forma-pago-detail.component.html',
  styleUrl: './forma-pago-detail.component.scss',
})
export class FormaPagoDetailComponent implements OnInit {
  private readonly service = inject(FormaPagoService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly formaPago = signal<FormaPago | null>(null);
  /**
   * Cuenta contable como `código - nombre`. Se arma acá y no en el template
   * porque dos interpolaciones vecinas quedan en líneas distintas al formatear y
   * el colapso de espacios mete un blanco de más.
   */
  protected readonly cuentaContable = computed(() => {
    const m = this.formaPago();
    if (!m?.cuenta) return '';
    return [m.cuenta_codigo, m.cuenta_nombre].filter(Boolean).join(' - ');
  });
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo activo → listado de formas de pago → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const formaPago = this.formaPago();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.formaPago.name,
        routerLink: slug ? ['/t', slug, moduleId, ...FORMA_PAGO_LIST_PATH] : undefined,
      },
    ];
    if (formaPago) items.push({ label: formaPago.nombre });
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
    this.loadFormaPago(id);
  }

  protected onBack(): void {
    this.navigate(...FORMA_PAGO_LIST_PATH);
  }

  protected onEdit(): void {
    const m = this.formaPago();
    if (!m) return;
    this.navigate(...FORMA_PAGO_LIST_PATH, 'editar', m.id);
  }

  private loadFormaPago(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => {
          this.formaPago.set(m);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.formaPago.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...subPath]);
  }
}
