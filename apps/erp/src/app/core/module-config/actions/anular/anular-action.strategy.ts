import { Injectable, inject } from '@angular/core';
import { DialogService } from 'primeng/dynamicdialog';
import { EMPTY, from, of, type Observable } from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  finalize,
  map,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
  extractErrorMessage,
  type DocumentEntityConfig,
} from '@reddoc/core';
import type { ToolbarAction } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import type { AnularConfirmData } from './anular-confirm-modal.component';

/** Cuántos rechazos se detallan en el aviso; el resto se resume con un conteo. */
const MAX_RECHAZOS_DETALLADOS = 3;

/** Lo que pasó con cada documento del lote. */
type ResultadoAnular =
  | { readonly id: string | number; readonly ok: true }
  | { readonly id: string | number; readonly ok: false; readonly motivo: string };

/**
 * "Anular" desde el listado: anula los documentos marcados. Aparece en rojo
 * junto a "Eliminar" solo mientras hay filas marcadas (`placement: 'selection'`).
 *
 * El backend anula de a uno (`POST <endpoint>/anular/` con `{ id }`), así que el
 * lote va **en secuencia**: anular bloquea la fila y revierte cartera e
 * inventario, y en paralelo dos documentos podrían pisarse. Un rechazo no corta
 * el lote; cada petición va sin el toast del interceptor y al final sale **un
 * solo aviso** con cuántos se anularon y por qué no se pudieron anular los demás.
 *
 * Qué se puede anular lo decide el backend (sin aprobar, ya anulado,
 * contabilizado, enviado a la DIAN…): el listado solo conoce los ids marcados, y
 * repetir la regla acá sería tener dos versiones de ella.
 *
 * Solo se ofrece en documentos con `capabilities.canAnular`, la misma bandera
 * que enciende "Anular" en la ficha.
 */
@Injectable()
export class AnularActionStrategy implements EntityActionStrategy {
  readonly id = 'anular';
  readonly placement = 'selection' as const;

  readonly toolbarAction: ToolbarAction = {
    id: this.id,
    labelKey: 'documentActions.anularLista.label',
    iconClass: 'pi pi-ban',
  };

  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita lanzar dos lotes si se clickea repetido antes de terminar. */
  private anulando = false;

  isAvailable(document: DocumentEntityConfig): boolean {
    return document.capabilities.canAnular ?? false;
  }

  execute(ctx: EntityActionContext): Observable<void> {
    if (this.anulando) return EMPTY;
    const dict = this.i18n.t().documentActions.anularLista;
    if (ctx.selectedIds.length === 0) {
      this.toast.warn(dict.sinSeleccion.title, dict.sinSeleccion.desc);
      return EMPTY;
    }
    const ids = [...ctx.selectedIds];

    return this.confirmar(ids.length).pipe(
      switchMap(() => {
        this.anulando = true;
        return from(ids).pipe(
          concatMap((id) =>
            this.gateway.anular(ctx.document, id, { errorToast: false }).pipe(
              map((): ResultadoAnular => ({ id, ok: true })),
              catchError((err: unknown) =>
                of<ResultadoAnular>({
                  id,
                  ok: false,
                  motivo: extractErrorMessage(err, dict.error.desc),
                }),
              ),
            ),
          ),
          toArray(),
          tap((resultados) => this.avisar(resultados, ctx)),
          finalize(() => {
            this.anulando = false;
          }),
        );
      }),
      map(() => void 0),
    );
  }

  /** Un solo aviso para todo el lote; recarga si algo cambió. */
  private avisar(resultados: readonly ResultadoAnular[], ctx: EntityActionContext): void {
    const dict = this.i18n.t().documentActions.anularLista;
    const total = resultados.length;
    const rechazos = resultados.filter((r): r is Extract<ResultadoAnular, { ok: false }> => !r.ok);
    const anulados = total - rechazos.length;

    if (rechazos.length === 0) {
      const desc = total === 1 ? dict.exito.descUno : dict.exito.desc.replace('{n}', String(total));
      this.toast.success(dict.exito.title, desc);
    } else {
      const detalle = this.detalleRechazos(rechazos);
      if (anulados === 0) {
        this.toast.error(dict.error.title, detalle);
      } else {
        this.toast.warn(
          dict.parcial.title.replace('{n}', String(anulados)).replace('{total}', String(total)),
          detalle,
        );
      }
    }

    if (anulados > 0) {
      ctx.clearSelection();
      ctx.reload();
    }
  }

  /** «ID 12: motivo · ID 15: motivo y 4 más». */
  private detalleRechazos(rechazos: readonly { id: string | number; motivo: string }[]): string {
    const dict = this.i18n.t().documentActions.anularLista;
    const lineas = rechazos
      .slice(0, MAX_RECHAZOS_DETALLADOS)
      .map((r) => `${dict.idLabel} ${r.id}: ${r.motivo}`)
      .join(' · ');
    const resto = rechazos.length - MAX_RECHAZOS_DETALLADOS;
    return resto > 0 ? `${lineas} ${dict.yMas.replace('{n}', String(resto))}` : lineas;
  }

  /**
   * Modal propio y no `p-confirmDialog`: el strategy vive en root y el
   * `ConfirmationService` del listado es de componente. Se carga lazy.
   */
  private confirmar(cantidad: number): Observable<true> {
    const data: AnularConfirmData = { cantidad };
    return from(import('./anular-confirm-modal.component')).pipe(
      switchMap(({ AnularConfirmModalComponent }) => {
        const ref = this.dialog.open(AnularConfirmModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '26rem',
          data,
        });
        return ref ? ref.onClose : EMPTY;
      }),
      filter((confirmado: unknown): confirmado is true => confirmado === true),
    );
  }
}
