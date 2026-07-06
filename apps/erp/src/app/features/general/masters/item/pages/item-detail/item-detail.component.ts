import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import { ErpImageUploadComponent } from '@erp/core/components/image-upload/erp-image-upload.component';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '../../item.service';
import { ITEM_LIST_PATH } from '../../item.constants';
import type { Item, ItemImpuesto } from '../../item.model';

/** Badge de estado del item, con su clave i18n y color. */
interface ItemBadge {
  readonly labelKey: 'venta' | 'favorito' | 'inventario' | 'negativo' | 'inactivo';
  readonly tone: 'emerald' | 'amber' | 'sky' | 'slate' | 'rose';
}

/** Cuenta contable mostrable: etiqueta i18n + valor `código - nombre`. */
interface CuentaRow {
  readonly labelKey: 'cuentaVenta' | 'cuentaCompra' | 'cuentaCostoVenta' | 'cuentaInventario';
  readonly value: string;
}

/**
 * Detalle (ficha) de un item — solo lectura, salvo la imagen.
 *
 * Master del módulo General (camino B). Llega desde el listado (`detalle/:id`)
 * para verificar de un vistazo qué es el item (código, nombre, imagen, tipo,
 * estado), sus precios, impuestos y cuentas contables antes de vender/editar.
 * La imagen sí es editable: se carga/elimina vía el componente reusable.
 */
@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [
    ButtonModule,
    BreadcrumbComponent,
    CurrencyPipe,
    ErpImageUploadComponent,
    DetailHeaderComponent,
  ],
  templateUrl: './item-detail.component.html',
  styleUrl: './item-detail.component.scss',
})
export class ItemDetailComponent implements OnInit {
  private readonly itemService = inject(ItemService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del item (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly item = signal<Item | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly isSavingImage = signal(false);

  /** Migas: módulo General → listado de items → nombre del item abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const item = this.item();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.item.name,
        routerLink: slug ? ['/t', slug, moduleId, ...ITEM_LIST_PATH] : undefined,
      },
    ];
    if (item) items.push({ label: item.nombre });
    return items;
  });

  /**
   * URL de la imagen para el `<img>`. Punto único de ajuste: si el backend
   * devolviera una ruta relativa en vez de absoluta, anteponer aquí la base.
   */
  protected readonly imageUrl = computed(() => this.item()?.imagen ?? null);

  /** Tipo del item para el pill principal. */
  protected readonly tipo = computed<'producto' | 'servicio' | null>(() => {
    const it = this.item();
    if (!it) return null;
    return it.servicio ? 'servicio' : 'producto';
  });

  /** Badges de estado activos (solo se muestran los que aplican). */
  protected readonly badges = computed<readonly ItemBadge[]>(() => {
    const it = this.item();
    if (!it) return [];
    const badges: ItemBadge[] = [];
    if (it.venta) badges.push({ labelKey: 'venta', tone: 'emerald' });
    if (it.favorito) badges.push({ labelKey: 'favorito', tone: 'amber' });
    if (it.inventario) badges.push({ labelKey: 'inventario', tone: 'sky' });
    if (it.negativo) badges.push({ labelKey: 'negativo', tone: 'slate' });
    if (it.inactivo) badges.push({ labelKey: 'inactivo', tone: 'rose' });
    return badges;
  });

  protected readonly impuestosVenta = computed<readonly ItemImpuesto[]>(() =>
    (this.item()?.impuestos ?? []).filter((i) => i.impuesto_venta),
  );
  protected readonly impuestosCompra = computed<readonly ItemImpuesto[]>(() =>
    (this.item()?.impuestos ?? []).filter((i) => i.impuesto_compra),
  );

  /** Cuentas contables con valor, formateadas `código - nombre`. */
  protected readonly cuentas = computed<readonly CuentaRow[]>(() => {
    const it = this.item();
    if (!it) return [];
    const rows: CuentaRow[] = [];
    const push = (
      labelKey: CuentaRow['labelKey'],
      codigo?: string | null,
      nombre?: string | null,
    ) => {
      const value = [codigo, nombre].filter(Boolean).join(' - ');
      if (value) rows.push({ labelKey, value });
    };
    push('cuentaVenta', it.cuenta_venta_codigo, it.cuenta_venta_nombre);
    push('cuentaCompra', it.cuenta_compra_codigo, it.cuenta_compra_nombre);
    push('cuentaCostoVenta', it.cuenta_costo_venta_codigo, it.cuenta_costo_venta_nombre);
    push('cuentaInventario', it.cuenta_inventario_codigo, it.cuenta_inventario_nombre);
    return rows;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadItem(id);
  }

  protected onBack(): void {
    this.navigate(...ITEM_LIST_PATH);
  }

  protected onEdit(): void {
    const it = this.item();
    if (!it) return;
    this.navigate(...ITEM_LIST_PATH, 'editar', it.id);
  }

  protected onImageSelected(base64: string): void {
    const it = this.item();
    if (!it || this.isSavingImage()) return;
    this.isSavingImage.set(true);
    this.itemService
      .cargarImagen(it.id, base64)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingImage.set(false);
          const toasts = this.t().entities.item.detail.toasts.imageUploadSuccess;
          this.toast.success(toasts.title, toasts.desc);
          this.loadItem(it.id);
        },
        error: () => {
          this.isSavingImage.set(false);
          const toasts = this.t().entities.item.detail.toasts.imageUploadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  protected onImageRemoved(): void {
    const it = this.item();
    if (!it || this.isSavingImage()) return;
    this.isSavingImage.set(true);
    this.itemService
      .eliminarImagen(it.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSavingImage.set(false);
          const toasts = this.t().entities.item.detail.toasts.imageRemoveSuccess;
          this.toast.success(toasts.title, toasts.desc);
          this.loadItem(it.id);
        },
        error: () => {
          this.isSavingImage.set(false);
          const toasts = this.t().entities.item.detail.toasts.imageRemoveError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  private loadItem(id: number): void {
    this.itemService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
          this.item.set(item);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.item.form.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
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
