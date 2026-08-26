import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, formatCop } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ActivoService } from '../../activo.service';
import { ACTIVO_LIST_PATH } from '../../activo.constants';
import type { Activo } from '../../activo.model';

/** Une `código - nombre` de una cuenta, descartando lo que falte. */
function unirCuenta(codigo?: string | null, nombre?: string | null): string {
  return [codigo, nombre].filter(Boolean).join(' - ');
}

@Component({
  selector: 'app-activo-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
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

  /** Importes en pesos. `formatCop` resuelve el nulo y el valor como string. */
  protected readonly valorCompraFmt = computed(() => {
    const a = this.activo();
    return a?.valor_compra != null ? formatCop(a.valor_compra) : '';
  });

  protected readonly depreciacionInicialFmt = computed(() => {
    const a = this.activo();
    return a?.depreciacion_inicial != null ? formatCop(a.depreciacion_inicial) : '';
  });

  /**
   * Cuentas contables como `código - nombre`. Se arman acá y no en el template:
   * dos interpolaciones vecinas quedan en líneas distintas al formatear y el
   * colapso de espacios mete un blanco de más.
   */
  protected readonly cuentaGasto = computed(() => {
    const a = this.activo();
    return unirCuenta(a?.cuenta_gasto_codigo, a?.cuenta_gasto_nombre);
  });

  protected readonly cuentaDepreciacion = computed(() => {
    const a = this.activo();
    return unirCuenta(a?.cuenta_depreciacion_codigo, a?.cuenta_depreciacion_nombre);
  });

  /** Fecha ISO a `yyyy-MM-dd`, la convención del ERP. Vacío si no hay. */
  protected fecha(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : '';
  }

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
