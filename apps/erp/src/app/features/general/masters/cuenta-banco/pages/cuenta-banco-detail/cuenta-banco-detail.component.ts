import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { CuentaBancoService } from '../../cuenta-banco.service';
import { CUENTA_BANCO_LIST_PATH } from '../../cuenta-banco.constants';
import type { CuentaBanco } from '../../cuenta-banco.model';

@Component({
  selector: 'app-cuenta-banco-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './cuenta-banco-detail.component.html',
  styleUrl: './cuenta-banco-detail.component.scss',
})
export class CuentaBancoDetailComponent implements OnInit {
  private readonly cuentaBancoService = inject(CuentaBancoService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly cuentaBanco = signal<CuentaBanco | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Etiqueta `código - nombre` de la cuenta contable; vacía si no hay cuenta. */
  protected readonly cuentaLabel = computed(() => {
    const c = this.cuentaBanco();
    if (!c || c.cuenta == null) return '';
    return [c.cuenta_codigo, c.cuenta_nombre].filter(Boolean).join(' - ');
  });

  /** Migas: módulo General → listado de cuentas de banco → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const c = this.cuentaBanco();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.cuentaBanco.name,
        routerLink: slug ? ['/t', slug, moduleId, ...CUENTA_BANCO_LIST_PATH] : undefined,
      },
    ];
    if (c) items.push({ label: c.nombre });
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
    this.loadCuentaBanco(id);
  }

  protected onBack(): void {
    this.navigate(...CUENTA_BANCO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.cuentaBanco();
    if (!c) return;
    this.navigate(...CUENTA_BANCO_LIST_PATH, 'editar', c.id);
  }

  private loadCuentaBanco(id: number): void {
    this.cuentaBancoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.cuentaBanco.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.cuentaBanco.detail.toasts;
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
