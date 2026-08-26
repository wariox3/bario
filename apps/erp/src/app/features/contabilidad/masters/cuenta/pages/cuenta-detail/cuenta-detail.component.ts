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
import type { AppDict } from '@erp/i18n';
import { CuentaService } from '../../cuenta.service';
import { CUENTA_LIST_PATH } from '../../cuenta.constants';
import type { Cuenta } from '../../cuenta.model';
import { TrasladarMovimientosModalComponent } from '../../components/trasladar-movimientos-modal/trasladar-movimientos-modal.component';

/** Bandera de la cuenta como campo: etiqueta i18n + su valor. */
interface CuentaCondicion {
  readonly labelKey: 'permiteMovimiento' | 'exigeBase' | 'exigeContacto' | 'exigeGrupo';
  readonly value: boolean;
}

/** Un nivel del PUC (clase, grupo o cuenta) con su código y su nombre. */
interface CuentaNivel {
  readonly codigoKey: 'codigoClase' | 'codigoGrupo' | 'codigoCuenta';
  readonly nombreKey: 'cuentaClase' | 'cuentaGrupo' | 'cuentaCuenta';
  readonly codigo: number | null;
  readonly nombre: string | null;
}

@Component({
  selector: 'app-cuenta-detail',
  standalone: true,
  imports: [ButtonModule, MenuModule, BreadcrumbComponent, TrasladarMovimientosModalComponent],
  templateUrl: './cuenta-detail.component.html',
  styleUrl: './cuenta-detail.component.scss',
})
export class CuentaDetailComponent implements OnInit {
  private readonly service = inject(CuentaService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly cuenta = signal<Cuenta | null>(null);

  /**
   * Condiciones que la cuenta impone al imputarla, como campos con valor.
   *
   * Antes eran pills que solo aparecían cuando la bandera estaba activa, así que
   * «no exige contacto» y «nadie lo definió» se veían igual. Como campos Sí/No la
   * ausencia se lee como ausencia.
   */
  protected readonly condiciones = computed<readonly CuentaCondicion[]>(() => {
    const c = this.cuenta();
    if (!c) return [];
    return [
      { labelKey: 'permiteMovimiento', value: c.permite_movimiento },
      { labelKey: 'exigeBase', value: c.exige_base },
      { labelKey: 'exigeContacto', value: c.exige_contacto },
      { labelKey: 'exigeGrupo', value: c.exige_grupo },
    ];
  });
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /**
   * Niveles del PUC de los que cuelga la cuenta, cada uno con su código y su
   * nombre. El código **es** el id (`clase 1 → grupo 13 → cuenta 1305`, ver
   * `calcularRangoIds`), así que no hace falta pedirle nada más al backend. Sin
   * él la ficha no permitía comparar contra un plan de cuentas impreso, que es
   * como se verifica una imputación.
   */
  protected readonly jerarquia = computed<readonly CuentaNivel[]>(() => {
    const c = this.cuenta();
    if (!c) return [];
    return [
      {
        codigoKey: 'codigoClase',
        nombreKey: 'cuentaClase',
        codigo: c.cuenta_clase,
        nombre: c.cuenta_clase_nombre,
      },
      {
        codigoKey: 'codigoGrupo',
        nombreKey: 'cuentaGrupo',
        codigo: c.cuenta_grupo,
        nombre: c.cuenta_grupo_nombre,
      },
      {
        codigoKey: 'codigoCuenta',
        nombreKey: 'cuentaCuenta',
        codigo: c.cuenta_cuenta,
        nombre: c.cuenta_cuenta_nombre,
      },
    ];
  });

  private readonly accionesMenu = viewChild<Menu>('accionesMenu');

  protected readonly trasladoVisible = signal(false);

  /**
   * Entradas del dropdown "Acciones". `computed` (ref estable salvo cambio de
   * idioma) para que `p-menu` no pierda el primer click al recrear el array.
   */
  protected readonly accionesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.cuenta.detail.traslado.menuItem,
      icon: 'pi pi-arrow-right-arrow-left',
      command: () => this.trasladoVisible.set(true),
    },
  ]);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const cuenta = this.cuenta();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.cuenta.name,
        routerLink: slug ? ['/t', slug, ...CUENTA_LIST_PATH] : undefined,
      },
    ];
    if (cuenta) items.push({ label: cuenta.nombre });
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
    this.loadCuenta(id);
  }

  protected onBack(): void {
    this.navigate(...CUENTA_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.cuenta();
    if (!c) return;
    this.navigate(...CUENTA_LIST_PATH, 'editar', c.id);
  }

  protected toggleAcciones(event: Event): void {
    this.accionesMenu()?.toggle(event);
  }

  /** Tras un traslado la cuenta puede haber cambiado: se relee la ficha. */
  protected onTrasladoDone(): void {
    const c = this.cuenta();
    if (c) this.loadCuenta(c.id);
  }

  private loadCuenta(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.cuenta.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.cuenta.detail.toasts;
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
