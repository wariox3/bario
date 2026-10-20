import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { finalize, type Subscription } from 'rxjs';
import { I18nService, ToastService, type ErpSelectOption } from '@reddoc/core';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import { MODELO, ModelPermissionsService } from '@erp/core/permissions';
import { AccessDeniedComponent } from '@erp/core/components/access-denied/access-denied.component';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionAporteService } from '../../../configuracion-aporte/configuracion-aporte.service';
import type {
  ConfiguracionAporte,
  ConfiguracionAporteRow,
} from '../../../configuracion-aporte/configuracion-aporte.model';
import { toConfiguracionAporteRow } from '../../../configuracion-aporte/configuracion-aporte.mapper';
import { copiaCuentaOption } from '../../../cuenta.mapper';

/**
 * Tabla de aportes dentro del área Humano de la configuración: una cuenta
 * contable por aporte a seguridad social y parafiscales. Las filas las siembra
 * el backend; solo se edita la cuenta.
 *
 * Se edita en la propia tabla, como en el legacy y en Provisión: la cuenta es
 * un selector siempre visible y elegir otra la guarda al instante (PATCH). Son
 * seis filas fijas, así que no se pagina.
 */
@Component({
  selector: 'app-aporte-table',
  standalone: true,
  imports: [FormsModule, ButtonModule, AccessDeniedComponent, ErpCuentaSelectComponent],
  templateUrl: './aporte-table.component.html',
})
export class AporteTableComponent {
  private readonly service = inject(ConfiguracionAporteService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly rows = signal<readonly ConfiguracionAporteRow[]>([]);
  /** Arranca en `true`: hasta saber si puede ver, la tabla muestra su esqueleto. */
  protected readonly isLoading = signal(true);
  protected readonly puedeVer = signal(true);
  protected readonly puedeEditar = signal(false);
  protected readonly loadFailed = signal(false);
  /** Fila con un guardado en vuelo; `null` si ninguna. */
  protected readonly busyId = signal<number | null>(null);
  /** Filas cuyo selector la persona vació y todavía no eligió otra cuenta. */
  private readonly vaciadas = new Set<number>();
  /** Refresco en vuelo tras un guardado; uno nuevo lo cancela. */
  private refresco?: Subscription;

  constructor() {
    // Los grants se piden antes de listar: sin permiso de ver, la petición
    // sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.humano.configuracionAporte)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((grants) => {
        this.puedeVer.set(grants.ver);
        this.puedeEditar.set(grants.editar);
        if (grants.ver) {
          this.cargar();
        } else {
          this.isLoading.set(false);
        }
      });
  }

  protected cargar(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);

    this.service
      .listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.setRows(respuesta),
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.humano.aporte.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  /**
   * Guarda al instante la cuenta elegida. El selector solo emite al elegir una
   * opción o al vaciarlo. Vaciarlo no guarda nada: es el primer paso para
   * buscar otra cuenta, así que solo se anota y, si la persona sale del campo sin
   * elegir, `onSalirCuenta` le devuelve la guardada.
   */
  protected onCambioCuenta(row: ConfiguracionAporteRow, cuenta: ErpSelectOption | null): void {
    if (!cuenta) {
      this.vaciadas.add(row.id);
      return;
    }
    this.vaciadas.delete(row.id);
    if (cuenta.id === row.cuenta) return;

    const toasts = this.t().configuracion.humano.aporte.toasts;
    this.busyId.set(row.id);

    this.service
      .update(row.id, { cuenta: cuenta.id })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyId.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
          this.recargarSinEsqueleto();
        },
        error: () => {
          this.toast.error(toasts.saveError.title, toasts.saveError.desc);
          // Devuelve la celda a la cuenta que sigue guardada.
          this.recargarSinEsqueleto();
        },
      });
  }

  /** Al salir de un selector vaciado sin elegir otra cuenta, vuelve a mostrar la guardada. */
  protected onSalirCuenta(row: ConfiguracionAporteRow): void {
    if (!this.vaciadas.delete(row.id)) return;
    this.rows.update((rows) =>
      rows.map((r) =>
        r.id === row.id ? { ...r, cuenta_option: copiaCuentaOption(r.cuenta_option) } : r,
      ),
    );
  }

  /**
   * Refresca las filas tras guardar sin pasar por el esqueleto: la tabla no
   * parpadea. Cancela el refresco anterior: con dos cambios seguidos, la lectura
   * del primero podría llegar después y mostrar un valor viejo.
   */
  private recargarSinEsqueleto(): void {
    this.refresco?.unsubscribe();
    this.refresco = this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (respuesta) => this.setRows(respuesta) });
  }

  private setRows(respuesta: readonly ConfiguracionAporte[]): void {
    const tipos = this.t().configuracion.humano.tipos;
    this.rows.set(respuesta.map((aporte) => toConfiguracionAporteRow(aporte, tipos)));
  }
}
