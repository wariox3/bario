import { CurrencyPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpImageUploadComponent } from '@erp/core/components/image-upload/erp-image-upload.component';
import { ArchivosDialogComponent } from '@erp/core/components/archivos-dialog/archivos-dialog.component';
import { ARCHIVO_TIPO } from '@erp/core/components/archivos-dialog/archivo.service';
import { MODELO } from '@erp/core/permissions';
import type { ArchivoOwner } from '@erp/core/components/archivos-dialog/archivo.types';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '../../item.service';
import { ITEM_LIST_PATH } from '../../item.constants';
import type { Item, ItemImpuesto } from '../../item.model';

/**
 * Bandera del ítem como **campo**, no como pill.
 *
 * Las pills solo se pintaban cuando el flag estaba activo, así que un ítem que
 * no maneja inventario se veía igual que uno del que nadie lo definió. Como
 * campo `Sí`/`No` la ausencia se lee como ausencia.
 */
interface ItemFlag {
  readonly labelKey: 'inventario' | 'negativo' | 'venta' | 'favorito';
  readonly value: boolean;
}

/**
 * Cuenta contable mostrable: etiqueta i18n + valor `código - nombre`.
 * `value` es `null` cuando el ítem no tiene esa cuenta asignada — la fila se
 * pinta igual, con una raya.
 */
interface CuentaRow {
  readonly labelKey: 'cuentaVenta' | 'cuentaCompra' | 'cuentaCostoVenta' | 'cuentaInventario';
  readonly value: string | null;
}

/**
 * Detalle (ficha) de un item — solo lectura, salvo la imagen.
 *
 * Master del módulo General (camino B). Llega desde el listado (`detalle/:id`)
 * para verificar de un vistazo qué es el item (imagen, nombre, código, tipo,
 * clasificación), sus precios, impuestos y cuentas contables antes de
 * vender/editar. La imagen sí es editable: se carga/elimina vía el componente
 * reusable.
 *
 * Sigue el patrón "ficha de detalle en grupos" del sistema (ver
 * `.interface-design/system.md`), igual que la ficha del contacto: **una** card
 * con los campos repartidos en grupos lado a lado, y sin `<lib-detail-header>`
 * —esa cabecera solo repetiría el nombre y el código, que ya son campos del
 * primer grupo—. La identidad la dan la miga y un `<h1>` accesible.
 */
@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [
    ButtonModule,
    MenuModule,
    BreadcrumbComponent,
    CurrencyPipe,
    ErpImageUploadComponent,
    ArchivosDialogComponent,
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

  /** Visibilidad de la galería de imágenes del ítem. */
  protected readonly imagenesVisible = signal(false);

  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  /**
   * Entradas del menú "Opciones". `computed` para que la referencia sea estable
   * entre change detections: con un modelo nuevo en cada CD, `p-menu` pierde el
   * primer click. Solo cambia al cambiar de idioma.
   */
  protected readonly opcionesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.item.detail.opciones.imagenes,
      icon: 'pi pi-images',
      command: () => this.imagenesVisible.set(true),
    },
  ]);

  /** Dueño de los archivos: este ítem. `null` hasta que la ficha carga. */
  protected readonly archivosOwner = computed<ArchivoOwner | null>(() => {
    const it = this.item();
    return it ? { modelo: MODELO.general.item, objetoId: it.id } : null;
  });

  /**
   * La galería del ítem administra el tipo **imagen** del backend: lista y sube
   * solo esas, y por eso el picker se acota a los formatos que el backend acepta
   * como tal. La imagen principal es otra cosa —vive en el encabezado y va por
   * `item/cargar-imagen/`—; esta guarda las demás fotos del ítem.
   */
  protected readonly archivosTipo = ARCHIVO_TIPO.IMAGEN;
  protected readonly archivosAccept = '.png,.jpg,.jpeg';

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

  /**
   * Banderas del ítem, con su valor. Las de inventario solo aplican a productos
   * —el formulario tampoco las captura para un servicio—, así que en un servicio
   * no se listan en vez de decir "No" sobre algo que no se le pregunta.
   */
  protected readonly clasificacion = computed<readonly ItemFlag[]>(() => {
    const it = this.item();
    if (!it) return [];
    const flags: ItemFlag[] = [];
    if (!it.servicio) {
      flags.push({ labelKey: 'inventario', value: it.inventario });
      flags.push({ labelKey: 'negativo', value: it.negativo });
    }
    flags.push({ labelKey: 'venta', value: it.venta });
    flags.push({ labelKey: 'favorito', value: it.favorito });
    return flags;
  });

  /** El ítem inactivo es la excepción que merece un badge: se ve sin leer. */
  protected readonly inactivo = computed(() => this.item()?.inactivo ?? false);

  protected readonly impuestosVenta = computed<readonly ItemImpuesto[]>(() =>
    (this.item()?.impuestos ?? []).filter((i) => i.impuesto_venta),
  );
  protected readonly impuestosCompra = computed<readonly ItemImpuesto[]>(() =>
    (this.item()?.impuestos ?? []).filter((i) => i.impuesto_compra),
  );

  /** Cuentas contables con valor, formateadas `código - nombre`. */
  /**
   * Las **cuatro** cuentas contables del ítem, siempre, aunque no estén
   * asignadas: la que falta vale `null` y la ficha la pinta con una raya. Si se
   * omitieran, el lector no podría distinguir "este ítem no imputa inventario"
   * de "no me fijé si lo imputa", y la ficha cambiaría de forma según el ítem.
   */
  protected readonly cuentas = computed<readonly CuentaRow[]>(() => {
    const it = this.item();
    if (!it) return [];
    const fila = (
      labelKey: CuentaRow['labelKey'],
      codigo?: string | null,
      nombre?: string | null,
    ): CuentaRow => ({ labelKey, value: [codigo, nombre].filter(Boolean).join(' - ') || null });
    return [
      fila('cuentaVenta', it.cuenta_venta_codigo, it.cuenta_venta_nombre),
      fila('cuentaCompra', it.cuenta_compra_codigo, it.cuenta_compra_nombre),
      fila('cuentaCostoVenta', it.cuenta_costo_venta_codigo, it.cuenta_costo_venta_nombre),
      fila('cuentaInventario', it.cuenta_inventario_codigo, it.cuenta_inventario_nombre),
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
    this.loadItem(id);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }

  protected onArchivosVisibleChange(visible: boolean): void {
    this.imagenesVisible.set(visible);
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
