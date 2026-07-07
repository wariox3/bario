import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '../../contacto.service';
import { CONTACTO_LIST_PATH } from '../../contacto.constants';
import type { Contacto } from '../../contacto.model';

/** Rol comercial activo del contacto, con su clave i18n y color de pill. */
interface ContactoRol {
  readonly key: 'cliente' | 'proveedor' | 'empleado';
  readonly tone: 'emerald' | 'amber' | 'sky';
}

/**
 * Detalle (ficha) de un contacto — solo lectura.
 *
 * Master del módulo General (camino B). Llega desde el listado (`detalle/:id`)
 * para verificar de un vistazo identidad, contacto y rol comercial antes de
 * editar/llamar/facturar. Solo muestra campos con valor legible: los FK que el
 * backend devuelve únicamente como id (plazo de pago, precio, asesor, etc.) se
 * omiten porque su `_nombre` no viaja en `getById`.
 */
@Component({
  selector: 'app-contacto-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './contacto-detail.component.html',
  styleUrl: './contacto-detail.component.scss',
})
export class ContactoDetailComponent implements OnInit {
  private readonly contactoService = inject(ContactoService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del contacto (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly contacto = signal<Contacto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo General → listado de contactos → nombre del contacto abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const contacto = this.contacto();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.contacto.name,
        routerLink: slug ? ['/t', slug, moduleId, ...CONTACTO_LIST_PATH] : undefined,
      },
    ];
    if (contacto) items.push({ label: contacto.nombre_corto });
    return items;
  });

  /** Iniciales para el monograma: nombre1+apellido1 o, si no, nombre_corto. */
  protected readonly iniciales = computed(() => {
    const c = this.contacto();
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
    const c = this.contacto();
    if (!c) return '';
    const abrev = c.identificacion_abreviatura ? `${c.identificacion_abreviatura} ` : '';
    const dv = c.digito_verificacion ? `-${c.digito_verificacion}` : '';
    return `${abrev}${c.numero_identificacion}${dv}`;
  });

  /** Pills de rol activas según los flags del contacto. */
  protected readonly roles = computed<readonly ContactoRol[]>(() => {
    const c = this.contacto();
    if (!c) return [];
    const roles: ContactoRol[] = [];
    if (c.cliente) roles.push({ key: 'cliente', tone: 'emerald' });
    if (c.proveedor) roles.push({ key: 'proveedor', tone: 'amber' });
    if (c.empleado) roles.push({ key: 'empleado', tone: 'sky' });
    return roles;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadContacto(id);
  }

  protected onBack(): void {
    this.navigate(...CONTACTO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.contacto();
    if (!c) return;
    this.navigate(...CONTACTO_LIST_PATH, 'editar', c.id);
  }

  private loadContacto(id: number): void {
    this.contactoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.contacto.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.contacto.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /** Navega dentro del tenant activo: `/t/<slug>/<...path>`. */
  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...subPath]);
  }
}
