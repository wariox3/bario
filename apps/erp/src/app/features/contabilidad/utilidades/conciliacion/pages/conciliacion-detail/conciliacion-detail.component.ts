import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import {
  I18nService,
  TenantService,
  ToastService,
  fromIsoDate,
  formatFechaLarga,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ConciliacionDetallesTabComponent } from '../../components/conciliacion-detalles-tab/conciliacion-detalles-tab.component';
import { ConciliacionSoportesTabComponent } from '../../components/conciliacion-soportes-tab/conciliacion-soportes-tab.component';
import { CONCILIACION_LIST_PATH } from '../../conciliacion.constants';
import type { Conciliacion } from '../../conciliacion.model';
import { ConciliacionService } from '../../conciliacion.service';

/** Cabecera legible de la conciliación para la ficha. */
interface CabeceraView {
  readonly id: number;
  readonly cuentaBanco: string | null;
  readonly cuentaContable: string | null;
  readonly fechaDesde: Date | null;
  readonly fechaHasta: Date | null;
}

/**
 * Ficha de una **conciliación bancaria** — solo lectura.
 *
 * Monta las dos mismas pestañas que el banco de trabajo pero con `canOperate` en
 * falso: se puede consultar y exportar, no cargar, importar, conciliar ni
 * limpiar. Sirve para revisar una conciliación cerrada sin riesgo de tocarla.
 */
@Component({
  selector: 'app-conciliacion-detail',
  standalone: true,
  imports: [
    ButtonModule,
    TabsModule,
    BreadcrumbComponent,
    ConciliacionDetallesTabComponent,
    ConciliacionSoportesTabComponent,
  ],
  templateUrl: './conciliacion-detail.component.html',
  styleUrl: './conciliacion-detail.component.scss',
})
export class ConciliacionDetailComponent implements OnInit {
  private readonly service = inject(ConciliacionService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del registro (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly cabecera = signal<CabeceraView | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly activeTab = signal<'detalles' | 'soporte'>('detalles');

  protected readonly conciliacionId = computed(() => {
    const id = this.id();
    return id ? Number(id) : 0;
  });

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.conciliacion.name,
        routerLink: slug ? ['/t', slug, ...CONCILIACION_LIST_PATH] : undefined,
      },
      { label: `ID ${this.id() ?? ''}` },
    ];
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.load(id);
  }

  protected onBack(): void {
    this.navigateTo();
  }

  protected onEdit(): void {
    const id = this.id();
    if (!id) return;
    this.navigateTo('editar', Number(id));
  }

  /** Fecha larga de la cabecera del documento (`05 de agosto de 2026`). */
  protected formatFecha(date: Date | null): string {
    return formatFechaLarga(date, '—');
  }

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (read: Conciliacion) => {
          const cuentaContable = [
            read.cuenta_banco__cuenta__codigo,
            read.cuenta_banco__cuenta__nombre,
          ]
            .filter(Boolean)
            .join(' - ');
          this.cabecera.set({
            id: read.id,
            cuentaBanco: read.cuenta_banco__nombre ?? null,
            cuentaContable: cuentaContable || null,
            fechaDesde: fromIsoDate(read.fecha_desde),
            fechaHasta: fromIsoDate(read.fecha_hasta),
          });
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.conciliacion.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateTo(segment?: string, id?: number): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const commands: (string | number)[] = ['/t', slug, ...CONCILIACION_LIST_PATH];
    if (segment) commands.push(segment);
    if (id != null) commands.push(id);
    void this.router.navigate(commands);
  }
}
