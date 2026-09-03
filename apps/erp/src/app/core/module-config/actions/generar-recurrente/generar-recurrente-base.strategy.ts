import { inject } from '@angular/core';
import { EMPTY, from, type Observable } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { DOCUMENT_TYPE_ID, extractErrorMessage, I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { DialogService } from 'primeng/dynamicdialog';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '../entity-action-dialog.defaults';
import type { GenerarDocumentoModalTexts } from '../generar/generar-documento-modal.component';
import type { EntityActionContext, EntityActionStrategy } from '../entity-action-strategy';
import { GenerarRecurrenteService } from './generar-recurrente.service';

/**
 * Tipo de la factura real que nace de cada plantilla recurrente.
 *
 * El backend genera con un par origen → destino: el origen es el documento
 * anfitrión (`ctx.document.documentTypeId`) y el destino sale de este mapa. Un
 * tipo que no esté mapeado no puede generar, y la acción lo dice en vez de
 * mandar un payload a ciegas.
 */
const DESTINO_POR_RECURRENTE: Readonly<Record<number, number>> = {
  [DOCUMENT_TYPE_ID.FACTURA_COMPRA_RECURRENTE]: DOCUMENT_TYPE_ID.COMPRA,
  [DOCUMENT_TYPE_ID.FACTURA_VENTA_RECURRENTE]: DOCUMENT_TYPE_ID.FACTURA_VENTA,
};

/**
 * Base de las acciones que generan facturas reales desde **plantillas
 * recurrentes** vía `POST general/documento/generar/`.
 *
 * Concentra todo lo que las variantes comparten —resolver el destino, abrir el
 * modal de período (lazy), armar el POST, los toasts y el reload— y deja a cada
 * subclase solo lo que las distingue:
 *
 *  - `id` / `toolbarAction` / `placement`: su identidad en el toolbar.
 *  - `modalTexts()`: los textos de su modal (una llama a "las seleccionadas",
 *    la otra advierte que toma todas).
 *  - `resolveScope(ctx)`: el alcance. Devuelve los `documento_ids` a mandar, o
 *    `'todos'` para omitir el campo (el backend toma todas las del tipo), o
 *    `null` para abortar sin HTTP habiendo ya avisado por toast.
 *
 * No lleva `@Injectable()`: es abstracta y nunca se provee; las subclases sí.
 */
export abstract class GenerarRecurrenteBaseStrategy implements EntityActionStrategy {
  abstract readonly id: string;
  abstract readonly toolbarAction: EntityActionStrategy['toolbarAction'];

  /** Dentro del dropdown "Acciones" salvo que la subclase diga otra cosa. */
  readonly placement: 'menu' | 'button' = 'menu';

  protected readonly dialog = inject(DialogService);
  protected readonly api = inject(GenerarRecurrenteService);
  protected readonly toast = inject(ToastService);
  protected readonly i18n = inject<I18nService<AppDict>>(I18nService);

  /** Evita disparos concurrentes si se clickea repetido antes de terminar. */
  private generating = false;

  /** Textos del modal de período de esta variante. */
  protected abstract modalTexts(): GenerarDocumentoModalTexts;

  /**
   * Alcance de la generación:
   *  - `readonly number[]` → se manda como `documento_ids`.
   *  - `'todos'` → se omite `documento_ids`; el backend toma todas las del tipo.
   *  - `null` → no se genera (la subclase ya avisó por qué).
   */
  protected abstract resolveScope(ctx: EntityActionContext): readonly number[] | 'todos' | null;

  /** Atajo al sub-diccionario común de las dos variantes. */
  protected get dict(): AppDict['documentActions']['generarRecurrente'] {
    return this.i18n.t().documentActions.generarRecurrente;
  }

  execute(ctx: EntityActionContext): Observable<void> {
    const dict = this.dict;

    const origen = ctx.document.documentTypeId;
    const destino = DESTINO_POR_RECURRENTE[origen];
    if (destino === undefined) {
      this.toast.error(dict.error.title, dict.sinDestino);
      return EMPTY;
    }

    const scope = this.resolveScope(ctx);
    if (scope === null) return EMPTY;

    if (this.generating) return EMPTY;

    // El modal se carga lazy: mantiene el datepicker fuera del bundle inicial
    // (los strategies se proveen eager en root). Mismo patrón que "generar".
    return from(import('../generar/generar-documento-modal.component')).pipe(
      switchMap(({ GenerarDocumentoModalComponent }) => {
        const ref = this.dialog.open(GenerarDocumentoModalComponent, {
          ...ENTITY_ACTION_DIALOG_DEFAULTS,
          width: '27rem',
          data: this.modalTexts(),
        });
        return ref ? ref.onClose : EMPTY;
      }),
      // El modal cierra con `null` al cancelar: solo seguimos con un período real.
      filter((periodo: unknown): periodo is Date => periodo instanceof Date),
      switchMap((periodo) => {
        this.generating = true;
        return this.api
          .generar({
            documento_tipo_id: origen,
            documento_tipo_id_destino: destino,
            // Omitir el campo es lo que significa "todas las del tipo": mandarlo
            // vacío sería una selección vacía, otra cosa.
            ...(scope === 'todos' ? {} : { documento_ids: scope }),
            mes: periodo.getMonth() + 1,
            anio: periodo.getFullYear(),
          })
          .pipe(
            tap((res) => {
              this.generating = false;
              if (res.count === 0) {
                this.toast.info(dict.empty.title, this.emptyDesc());
                return;
              }
              this.toast.success(dict.success.title, dict.success.desc);
              ctx.reload();
            }),
            catchError((err: unknown) => {
              this.generating = false;
              this.toast.error(dict.error.title, extractErrorMessage(err, dict.error.desc));
              return EMPTY;
            }),
          );
      }),
      map(() => void 0),
    );
  }

  /**
   * Descripción del toast de "no había nada por generar". Cada variante la
   * matiza (en la selección / en el período); default: la de la selección.
   */
  protected emptyDesc(): string {
    return this.dict.empty.desc;
  }
}
