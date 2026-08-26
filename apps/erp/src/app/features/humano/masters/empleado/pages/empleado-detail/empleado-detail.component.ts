import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { TelefonoPipe } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '@erp/features/general/masters/contacto/contacto.service';
import {
  direccionLineasDe,
  nombreCompletoDe,
  numeroDocumentoDe,
} from '@erp/features/general/masters/contacto/contacto.format';
import type { Empleado } from '../../empleado.model';
import { EMPLEADO_LIST_PATH } from '../../empleado.constants';

/**
 * Ficha (detalle) de un empleado — solo lectura. Empleado = contacto con
 * `empleado=true`; reutiliza `ContactoService.getById`.
 *
 * Sigue el patrón "ficha de detalle en grupos" del sistema, igual que la ficha
 * del contacto: **una** card con identificación, contacto y ubicación lado a
 * lado, y los datos bancarios en su propia card. Sin `<lib-detail-header>` —esa
 * cabecera repetía el nombre y el documento que ya son campos de la ficha—; la
 * identidad la dan la miga y un `<h1>` accesible.
 *
 * El formato de los tres campos compuestos (documento, nombre completo,
 * dirección) sale de `contacto.format`, compartido con la ficha del contacto:
 * es el mismo modelo, y duplicarlo dejaría las dos lecturas divergiendo.
 */
@Component({
  selector: 'app-empleado-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, TelefonoPipe],
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

  /** Ver `numeroDocumentoDe`: el DV solo aplica al NIT, no a una cédula. */
  protected readonly numeroDocumento = computed(() => {
    const c = this.empleado();
    return c ? numeroDocumentoDe(c) : '';
  });

  /** Ver `nombreCompletoDe`: arma el nombre desde las partes desglosadas. */
  protected readonly nombreCompleto = computed(() => {
    const c = this.empleado();
    return c ? nombreCompletoDe(c) : '';
  });

  /** Ver `direccionLineasDe`: la ubicación se lee como bloque, no como campos. */
  protected readonly direccionLineas = computed<readonly string[]>(() => {
    const c = this.empleado();
    return c ? direccionLineasDe(c) : [];
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
