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
import { type Observable, of, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpImageUploadComponent } from '@erp/core/components/image-upload/erp-image-upload.component';
import { ImagenesDialogComponent } from '@erp/core/components/imagenes-dialog/imagenes-dialog.component';
import { ImagenService } from '@erp/core/components/imagenes-dialog/imagen.service';
import type { Imagen } from '@erp/core/components/imagenes-dialog/imagen.types';
import { MODELO } from '@erp/core/permissions';
import type { ArchivoOwner } from '@erp/core/components/archivos-dialog/archivo.types';
import { dataUrlToFile } from '@erp/core/utils/data-url.util';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '../../item.service';
import { ITEM_LIST_PATH } from '../../item.constants';
import type { Item, ItemImpuesto } from '../../item.model';
import { ButtonGroupModule } from 'primeng/buttongroup';

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
 * Detalle (ficha) de un item — solo lectura, salvo las imágenes.
 *
 * Master del módulo General (camino B). Llega desde el listado (`detalle/:id`)
 * para verificar de un vistazo qué es el item (imagen, nombre, código, tipo,
 * clasificación), sus precios, impuestos y cuentas contables antes de
 * vender/editar. Las imágenes sí son editables: la principal desde el
 * encabezado y la galería completa desde "Opciones → Imágenes", las dos contra
 * `general/imagen/`.
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
    ButtonGroupModule,
    ButtonModule,
    MenuModule,
    BreadcrumbComponent,
    CurrencyPipe,
    ErpImageUploadComponent,
    ImagenesDialogComponent,
  ],
  templateUrl: './item-detail.component.html',
  styleUrl: './item-detail.component.scss',
})
export class ItemDetailComponent implements OnInit {
  private readonly itemService = inject(ItemService);
  private readonly imagenService = inject(ImagenService);
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

  /** Dueño de las imágenes: este ítem. `null` hasta que la ficha carga. */
  protected readonly imagenesOwner = computed<ArchivoOwner | null>(() => {
    const it = this.item();
    return it ? { modelo: MODELO.general.item, objetoId: it.id } : null;
  });

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

  /** La principal, que el backend ya resuelve en el propio ítem. */
  protected readonly imageUrl = computed(() => this.item()?.imagen_principal_url ?? null);

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

  protected onImagenesVisibleChange(visible: boolean): void {
    this.imagenesVisible.set(visible);
  }

  /** La galería pudo mover la principal: se vuelve a leer el ítem. */
  protected onImagenesCambio(): void {
    const it = this.item();
    if (it) this.loadItem(it.id);
  }

  protected onBack(): void {
    this.navigate(...ITEM_LIST_PATH);
  }

  protected onEdit(): void {
    const it = this.item();
    if (!it) return;
    this.navigate(...ITEM_LIST_PATH, 'editar', it.id);
  }

  protected onNew(): void {
    this.navigate(...ITEM_LIST_PATH, 'nuevo');
  }

  /**
   * El encabezado muestra la principal, así que subir desde ahí es **cambiar**
   * la principal: se agrega a la galería y, si el backend no la dejó como
   * principal (porque ya había otra), se la marca. La anterior queda en la
   * galería.
   */
  protected onImageSelected(base64: string): void {
    const it = this.item();
    const owner = this.imagenesOwner();
    if (!it || !owner || this.isSavingImage()) return;

    const toasts = this.t().entities.item.detail.toasts;
    let archivo: File;
    try {
      archivo = dataUrlToFile(base64, 'imagen');
    } catch {
      this.toast.error(toasts.imageUploadError.title, toasts.imageUploadError.desc);
      return;
    }

    this.isSavingImage.set(true);
    this.imagenService
      .cargar(owner, archivo)
      .pipe(
        switchMap((imagen) =>
          imagen.principal ? of(imagen) : this.imagenService.marcarPrincipal(imagen.id),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSavingImage.set(false);
          this.toast.success(toasts.imageUploadSuccess.title, toasts.imageUploadSuccess.desc);
          this.loadItem(it.id);
        },
        error: () => {
          this.isSavingImage.set(false);
          this.toast.error(toasts.imageUploadError.title, toasts.imageUploadError.desc);
          // La subida pudo quedar hecha aunque fallara el marcado.
          this.loadItem(it.id);
        },
      });
  }

  /**
   * Quitar desde el encabezado borra la principal. El ítem trae su URL pero no
   * su id, así que se busca en la galería (la principal viene primera).
   */
  protected onImageRemoved(): void {
    const it = this.item();
    const owner = this.imagenesOwner();
    if (!it || !owner || this.isSavingImage()) return;

    const toasts = this.t().entities.item.detail.toasts;
    this.isSavingImage.set(true);
    this.imagenService
      .listar(owner)
      .pipe(
        switchMap((imagenes) => this.eliminarPrincipal(imagenes)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSavingImage.set(false);
          this.toast.success(toasts.imageRemoveSuccess.title, toasts.imageRemoveSuccess.desc);
          this.loadItem(it.id);
        },
        error: () => {
          this.isSavingImage.set(false);
          this.toast.error(toasts.imageRemoveError.title, toasts.imageRemoveError.desc);
        },
      });
  }

  /** Sin principal en la galería no hay nada que borrar: se recarga y listo. */
  private eliminarPrincipal(imagenes: readonly Imagen[]): Observable<void> {
    const principal = imagenes.find((imagen) => imagen.principal);
    return principal ? this.imagenService.eliminar(principal.id) : of(undefined);
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
