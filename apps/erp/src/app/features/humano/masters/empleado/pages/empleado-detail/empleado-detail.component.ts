import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '@erp/features/general/masters/contacto/contacto.service';
import type { Empleado } from '../../empleado.model';
import { EMPLEADO_LIST_PATH } from '../../empleado.constants';

/**
 * Ficha (detalle) de un empleado — solo lectura. Empleado = contacto con
 * `empleado=true`; reutiliza `ContactoService.getById`. Muestra identidad,
 * contacto, ubicación y datos bancarios.
 */
@Component({
  selector: 'app-empleado-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './empleado-detail.component.html',
  styleUrl: './empleado-detail.component.scss',
})
export class EmpleadoDetailComponent implements OnInit {
  private readonly contactoService = inject(ContactoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly empleado = signal<Empleado | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const empleado = this.empleado();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.empleado.name,
        routerLink: slug ? ['/t', slug, 'humano', ...EMPLEADO_LIST_PATH] : undefined,
      },
    ];
    if (empleado) items.push({ label: empleado.nombre_corto });
    return items;
  });

  /** Iniciales para el monograma: nombre1+apellido1 o, si no, nombre_corto. */
  protected readonly iniciales = computed(() => {
    const c = this.empleado();
    if (!c) return '';
    const desde = (...partes: (string | null)[]): string =>
      partes
        .map((p) => p?.trim()?.[0] ?? '')
        .join('')
        .toUpperCase();
    const porNombre = desde(c.nombre1, c.apellido1);
    if (porNombre) return porNombre;
    return (c.nombre_corto ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  });

  /** Documento legible: `CC 1118260345` (+ `-1` si hay dígito de verificación). */
  protected readonly documento = computed(() => {
    const c = this.empleado();
    if (!c) return '';
    const abrev = c.identificacion_abreviatura ? `${c.identificacion_abreviatura} ` : '';
    const dv = c.digito_verificacion ? `-${c.digito_verificacion}` : '';
    return `${abrev}${c.numero_identificacion}${dv}`;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadEmpleado(id);
  }

  protected onBack(): void {
    this.navigate(...EMPLEADO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.empleado();
    if (!c) return;
    this.navigate(...EMPLEADO_LIST_PATH, 'editar', c.id);
  }

  private loadEmpleado(id: number): void {
    this.contactoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.empleado.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          this.toast.error(
            this.t().entities.empleado.detail.toasts.loadError.title,
            this.t().entities.empleado.detail.toasts.loadError.desc,
          );
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'humano', ...subPath]);
  }
}
