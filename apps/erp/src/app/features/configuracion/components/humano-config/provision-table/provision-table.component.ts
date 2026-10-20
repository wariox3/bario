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
import { ConfiguracionProvisionService } from '../../../configuracion-provision/configuracion-provision.service';
import type {
  ConfiguracionProvisionRow,
  ProvisionCuentaCampo,
} from '../../../configuracion-provision/configuracion-provision.model';
import { toConfiguracionProvisionRow } from '../../../configuracion-provision/configuracion-provision.mapper';
import { copiaCuentaOption } from '../../../cuenta.mapper';

/**
 * Tabla de provisiones dentro del área Humano de la configuración: cuentas
 * débito y crédito por tipo de provisión y tipo de costo. Las filas las siembra
 * el backend; solo se editan las cuentas.
 *
 * Se edita en la propia tabla, como en el legacy: cada cuenta es un selector
 * siempre visible y elegir otra la guarda al instante (PATCH solo de ese campo).
 * Las provisiones de seguridad social y parafiscales no llevan crédito: esa
 * celda queda vacía. Son pocas filas fijas, así que no se pagina.
 */
@Component({
  selector: 'app-provision-table',
  standalone: true,
  imports: [FormsModule, ButtonModule, AccessDeniedComponent, ErpCuentaSelectComponent],
  templateUrl: './provision-table.component.html',
})
export class ProvisionTableComponent {
  private readonly service = inject(ConfiguracionProvisionService);
  private readonly modelPermissions = inject(ModelPermissionsService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly rows = signal<readonly ConfiguracionProvisionRow[]>([]);
  /** Arranca en `true`: hasta saber si puede ver, la tabla muestra su esqueleto. */
  protected readonly isLoading = signal(true);
  protected readonly puedeVer = signal(true);
  protected readonly puedeEditar = signal(false);
  protected readonly loadFailed = signal(false);
  /** Celda con un guardado en vuelo (`<id>:<campo>`); `null` si ninguna. */
  protected readonly busyKey = signal<string | null>(null);
  /** Celdas (`<id>:<campo>`) cuyo selector la persona vació y todavía no eligió otra cuenta. */
  private readonly vaciadas = new Set<string>();
  /** Refresco en vuelo tras un guardado; uno nuevo lo cancela. */
  private refresco?: Subscription;

  constructor() {
    // Los grants se piden antes de listar: sin permiso de ver, la petición
    // sería un 403 garantizado con su toast de error encima.
    this.modelPermissions
      .load(MODELO.humano.configuracionProvision)
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
        next: (respuesta) => {
          const tipos = this.t().configuracion.humano.tipos;
          this.rows.set(
            respuesta.map((provision) => toConfiguracionProvisionRow(provision, tipos)),
          );
        },
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.humano.provision.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected busy(row: ConfiguracionProvisionRow, campo: ProvisionCuentaCampo): boolean {
    return this.busyKey() === `${row.id}:${campo}`;
  }

  /**
   * Guarda al instante la cuenta elegida. El selector solo emite al elegir una
   * opción o al vaciarlo. Vaciarlo no guarda nada: es el primer paso para
   * buscar otra cuenta, así que solo se anota y, si la persona sale del campo sin
   * elegir, `onSalirCuenta` le devuelve la guardada.
   */
  protected onCambioCuenta(
    row: ConfiguracionProvisionRow,
    campo: ProvisionCuentaCampo,
    cuenta: ErpSelectOption | null,
  ): void {
    const key = `${row.id}:${campo}`;
    if (!cuenta) {
      this.vaciadas.add(key);
      return;
    }
    this.vaciadas.delete(key);
    if (cuenta.id === row[campo]) return;

    const toasts = this.t().configuracion.humano.provision.toasts;
    this.busyKey.set(key);

    this.service
      .update(row.id, { [campo]: cuenta.id })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyKey.set(null)),
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
  protected onSalirCuenta(row: ConfiguracionProvisionRow, campo: ProvisionCuentaCampo): void {
    if (!this.vaciadas.delete(`${row.id}:${campo}`)) return;
    const option = campo === 'cuenta_debito' ? 'cuenta_debito_option' : 'cuenta_credito_option';
    this.rows.update((rows) =>
      rows.map((r) => (r.id === row.id ? { ...r, [option]: copiaCuentaOption(r[option]) } : r)),
    );
  }

  /**
   * Refresca las filas tras guardar sin pasar por el esqueleto: la tabla no
   * parpadea ni pierde el scroll mientras la persona sigue editando. Cancela el
   * refresco anterior: con dos cambios seguidos, la lectura del primero podría
   * llegar después y mostrar un valor viejo.
   */
  private recargarSinEsqueleto(): void {
    const tipos = this.t().configuracion.humano.tipos;
    this.refresco?.unsubscribe();
    this.refresco = this.service
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) =>
          this.rows.set(
            respuesta.map((provision) => toConfiguracionProvisionRow(provision, tipos)),
          ),
      });
  }
}
