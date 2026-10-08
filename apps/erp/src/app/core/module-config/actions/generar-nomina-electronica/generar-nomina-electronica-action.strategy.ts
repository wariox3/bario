import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, from, type Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { I18nService, TenantService, ToastService, extractErrorMessage } from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { DialogService } from 'primeng/dynamicdialog';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarNominaElectronicaService } from './generar-nomina-electronica.service';

/** Ruta de la utilidad de envío, relativa al tenant. */
const ENVIAR_PATH = ['humano', 'utilidades', 'enviar-nomina-electronica'];

/**
 * Acción "generar" de **nómina electrónica**: abre un modal con un selector de
 * mes/año y consolida las nóminas de ese periodo en documentos electrónicos.
 *
 * Al terminar ofrece **ir a emitirlos a la DIAN**. Encadenar las dos mitades del
 * flujo viene del ERP anterior y se conserva: consolidar sin emitir deja el
 * trabajo a medias, y el usuario que acaba de generar es el que va a emitir.
 *
 * Distinta de `GenerarDocumentoActionStrategy` (venta), que genera un tipo de
 * documento a partir de otro vía el endpoint genérico `documento/generar/`. Esta
 * tiene endpoint propio y no recibe tipos: el backend sabe qué consolidar.
 */
@Injectable()
export class GenerarNominaElectronicaActionStrategy implements EntityActionStrategy {
  readonly id = 'generar-nomina-electronica';

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'entities.nominaElectronica.generar.buttonLabel',
    iconClass: 'pi pi-bolt',
  };

  private readonly dialog = inject(DialogService);
  private readonly api = inject(GenerarNominaElectronicaService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  execute(ctx: EntityActionContext): Observable<void> {
    const dict = this.i18n.t().entities.nominaElectronica.generar;

    // Los modales se cargan lazy: mantienen el datepicker fuera del bundle
    // inicial (el strategy se provee eager en root).
    return from(import('./generar-nomina-electronica-modal.component')).pipe(
      switchMap(({ GenerarNominaElectronicaModalComponent }) => {
        const ref = this.dialog.open(GenerarNominaElectronicaModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '27rem',
        });
        return ref ? ref.onClose : EMPTY;
      }),
      // El modal cierra con `null` al cancelar: solo seguimos con un periodo real.
      filter((periodo: unknown): periodo is Date => periodo instanceof Date),
      switchMap((periodo) =>
        this.api.generar({ anio: periodo.getFullYear(), mes: periodo.getMonth() + 1 }).pipe(
          tap(() => {
            this.toast.success(dict.success.title, dict.success.desc);
            ctx.reload();
          }),
          switchMap(() => this.preguntarSiEmitir()),
          catchError((err: unknown) => {
            this.toast.error(dict.error.title, extractErrorMessage(err, dict.error.desc));
            return EMPTY;
          }),
        ),
      ),
      map(() => void 0),
    );
  }

  /**
   * Ofrece saltar a la utilidad de envío. Si el usuario dice que no, se queda en
   * el listado ya recargado con los documentos nuevos.
   */
  private preguntarSiEmitir(): Observable<unknown> {
    return from(import('./emitir-ahora-modal.component')).pipe(
      switchMap(({ EmitirAhoraModalComponent }) => {
        const ref = this.dialog.open(EmitirAhoraModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '26rem',
        });
        return ref ? ref.onClose : EMPTY;
      }),
      tap((irAEmitir: unknown) => {
        const slug = this.tenant.currentSlug();
        if (irAEmitir === true && slug) {
          void this.router.navigate(['/t', slug, ...ENVIAR_PATH]);
        }
      }),
    );
  }
}
