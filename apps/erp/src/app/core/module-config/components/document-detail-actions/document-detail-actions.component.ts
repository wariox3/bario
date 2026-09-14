import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Menu, MenuModule } from 'primeng/menu';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import {
  ENTITY_DATA_GATEWAY,
  I18nService,
  ToastService,
  extractErrorMessage,
  type DocumentEntityConfig,
} from '@reddoc/core';
import { ArchivosDialogComponent } from '@erp/core/components/archivos-dialog/archivos-dialog.component';
import { ContabilidadDialogComponent } from '@erp/core/components/contabilidad-dialog/contabilidad-dialog.component';
import { MODELO } from '@erp/core/permissions';
import type { ArchivoOwner } from '@erp/core/components/archivos-dialog/archivo.types';
import type { AppDict } from '@erp/i18n';

/** Acciones que cambian el estado del documento y que la botonera resuelve sola. */
type AccionEstado = 'aprobar' | 'desaprobar' | 'anular';

/**
 * Confirmación de cada acción de estado. Anular va en rojo: es irreversible —deja
 * el documento congelado, no lo devuelve a borrador como desaprobar—.
 */
const CONFIRMACION: Readonly<
  Record<
    AccionEstado,
    {
      readonly clave: 'confirmAprobar' | 'confirmDesaprobar' | 'confirmAnular';
      readonly icon: string;
      readonly peligrosa: boolean;
    }
  >
> = {
  aprobar: { clave: 'confirmAprobar', icon: 'pi pi-check-circle', peligrosa: false },
  desaprobar: { clave: 'confirmDesaprobar', icon: 'pi pi-times-circle', peligrosa: false },
  anular: { clave: 'confirmAnular', icon: 'pi pi-ban', peligrosa: true },
};

/**
 * Botonera de acciones de un documento en su **vista de detalle**: Aprobar,
 * Imprimir, un dropdown "Acciones" (Desaprobar y, opcionalmente, Anular) y un
 * dropdown "Opciones" (Archivos y Contabilidad). Compartida por todas las
 * fichas de detalle.
 *
 * Todas van en un `p-buttongroup`, que las lee como una sola pieza.
 *
 * **Resuelve sus acciones sola.** Aprobar, desaprobar, anular e imprimir eran
 * eventos que cada ficha atendía con el mismo bloque —confirmar, llamar al
 * gateway, avisar y recargar—: 22 copias calcadas. No cambian de endpoint según
 * el documento: van por `ENTITY_DATA_GATEWAY`, que lo deriva del
 * `DocumentEntityConfig`, así que la ficha solo pasa `[document]` y escucha
 * `documentoChanged` para recargar. Archivos y Contabilidad ya funcionaban así.
 *
 * La ficha sigue decidiendo **qué** se ofrece (los `show*`) y **cuándo** está
 * habilitado (los `can*`, atados a su estado). La confirmación la pinta este
 * componente con su propio `ConfirmationService`, sin depender de que la ficha
 * tenga un `<p-confirmDialog>`.
 *
 * **Emitir** es la excepción que sigue saliendo como evento: solo lo tiene la
 * nómina electrónica, que lo resuelve en su ficha.
 *
 * Dos acciones son **opt-in** vía `showAnular` / `showEmitir`, apagadas por
 * default: no todo documento se anula ni se emite a la DIAN, y esta botonera la
 * comparte todo el ERP. Prenderlas por default le pondría botones a fichas cuyo
 * backend no los atiende. `showAprobacion` y `showImprimir` son el caso
 * simétrico: vienen encendidos y se apagan donde no aplican (las plantillas
 * recurrentes). Si el dropdown "Acciones" se queda sin entradas, no se pinta.
 */
@Component({
  selector: 'app-document-detail-actions',
  standalone: true,
  imports: [
    ButtonModule,
    ButtonGroupModule,
    ConfirmDialogModule,
    MenuModule,
    ArchivosDialogComponent,
    ContabilidadDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './document-detail-actions.component.html',
  styleUrl: './document-detail-actions.component.scss',
})
export class DocumentDetailActionsComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.i18n.t;

  /** Documento activo: de su config sale el endpoint de cada acción. */
  readonly document = input.required<DocumentEntityConfig>();

  /**
   * Id del documento abierto: el que se aprueba, se imprime y es dueño de los
   * archivos adjuntos.
   *
   * Las fichas lo pasan directo desde el parámetro de ruta, que llega como
   * `string | undefined`; el `transform` lo normaliza acá para que ninguna tenga
   * que convertirlo. Sin un id válido, ninguna acción se ejecuta.
   */
  readonly documentoId = input<number | null, number | string | null | undefined>(null, {
    transform: toDocumentoId,
  });

  /** Habilita cada acción. Default `true`; las fichas los atan al estado del documento. */
  readonly canAprobar = input<boolean>(true);
  readonly canDesaprobar = input<boolean>(true);
  readonly canImprimir = input<boolean>(true);
  readonly canArchivos = input<boolean>(true);
  readonly canAnular = input<boolean>(true);
  readonly canEmitir = input<boolean>(true);
  readonly canContabilizar = input<boolean>(true);

  /**
   * Estado de contabilización del documento, para el diálogo "Contabilidad".
   * La ficha lo pasa desde su cabecera (`estado_contabilizado` del read).
   */
  readonly contabilizado = input<boolean>(false);

  /** Presencia de las acciones opt-in. Apagadas salvo que la ficha las pida. */
  readonly showAnular = input<boolean>(false);
  readonly showEmitir = input<boolean>(false);

  /**
   * Presencia de "Contabilidad" en el dropdown "Opciones". Encendida por
   * default —casi todo documento se contabiliza—, se apaga en los que no
   * generan movimiento contable, como los de inventario (entrada, salida,
   * traslado), igual que hacía el ERP anterior.
   */
  readonly showContabilidad = input<boolean>(true);

  /**
   * Presencia del eje de aprobación (botón "Aprobar" + "Desaprobar" del
   * dropdown). Encendido por default —casi todo documento se aprueba—, se apaga
   * en los que el backend no aprueba, como las plantillas recurrentes: un botón
   * que solo sabe fallar no informa, estorba.
   */
  readonly showAprobacion = input<boolean>(true);

  /**
   * Presencia del botón "Imprimir". Encendido por default, se apaga donde el
   * documento no se imprime: las plantillas recurrentes no son un comprobante
   * —de ellas nacen las facturas, que sí se imprimen—, así que su PDF no existe.
   */
  readonly showImprimir = input<boolean>(true);

  /** Emitir a la DIAN: lo resuelve la ficha (solo la nómina electrónica lo ofrece). */
  readonly emitir = output<void>();

  /**
   * El documento cambió de estado en el backend —se aprobó, desaprobó, anuló o
   * (des)contabilizó—: la ficha debe recargar su cabecera.
   */
  readonly documentoChanged = output<void>();

  private readonly accionesMenu = viewChild.required<Menu>('accionesMenu');
  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  protected readonly archivosVisible = signal(false);
  protected readonly contabilidadVisible = signal(false);

  /**
   * Acción en vuelo. Mientras hay una, sus botones muestran carga y no aceptan
   * un segundo click: sin esto un doble click aprueba dos veces y el backend
   * responde la segunda con error.
   */
  protected readonly enCurso = signal<AccionEstado | 'imprimir' | null>(null);

  /** Dueño de los archivos: el documento abierto. `null` mientras no hay id válido. */
  protected readonly archivosOwner = computed<ArchivoOwner | null>(() => {
    const id = this.documentoId();
    return id === null ? null : { modelo: MODELO.general.documento, objetoId: id };
  });

  /**
   * Entradas del dropdown "Acciones". Mismo patrón `computed` que "Opciones"
   * (ref estable salvo cambio de idioma o de `canDesaprobar`) para que `p-menu`
   * no pierda el primer click al recrear el array en cada CD.
   *
   * "Anular" va acá y no como botón propio: es destructiva e irreversible, así
   * que no conviene tenerla a un click de distancia.
   */
  protected readonly accionesItems = computed<MenuItem[]>(() => {
    const a = this.t().documentActions.detail;
    const ocupado = this.enCurso() !== null;
    const items: MenuItem[] = [];
    if (this.showAprobacion()) {
      items.push({
        label: a.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: !this.canDesaprobar() || ocupado,
        command: () => this.onAccionEstado('desaprobar'),
      });
    }
    if (this.showAnular()) {
      items.push({
        label: a.anular,
        icon: 'pi pi-ban',
        disabled: !this.canAnular() || ocupado,
        command: () => this.onAccionEstado('anular'),
      });
    }
    return items;
  });

  /**
   * Entradas del dropdown "Opciones". `computed` (ref estable salvo cambio real de
   * idioma o de los `can*`/`show*`) para no recrear el array en cada CD — eso
   * provoca que `p-menu` pierda el primer click.
   *
   * "Contabilidad" solo abre el diálogo: el permiso de (des)contabilizar lo
   * aplica el diálogo sobre sus botones, para que el libro se pueda consultar
   * aunque la acción esté vedada.
   */
  protected readonly opcionesItems = computed<MenuItem[]>(() => {
    const a = this.t().documentActions.detail;
    const sinDocumento = this.documentoId() === null;
    const items: MenuItem[] = [
      {
        label: a.archivos,
        icon: 'pi pi-folder',
        disabled: !this.canArchivos() || sinDocumento,
        command: () => this.archivosVisible.set(true),
      },
    ];
    if (this.showContabilidad()) {
      items.push({
        label: a.contabilidad,
        icon: 'pi pi-book',
        disabled: sinDocumento,
        command: () => this.contabilidadVisible.set(true),
      });
    }
    return items;
  });

  protected toggleAcciones(event: Event): void {
    this.accionesMenu().toggle(event);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }

  /** Pide confirmación y, al aceptar, ejecuta la acción de estado. */
  protected onAccionEstado(accion: AccionEstado): void {
    const id = this.documentoId();
    if (id === null || this.enCurso() !== null) return;
    const a = this.t().documentActions.detail;
    const { clave, icon, peligrosa } = CONFIRMACION[accion];
    this.confirmation.confirm({
      message: a[clave].message,
      header: a[clave].header,
      icon,
      acceptLabel: a[accion],
      acceptButtonProps: peligrosa ? { severity: 'danger' } : undefined,
      rejectLabel: this.t().common.actions.cancel,
      // Cancelar baja a secundario contorneado para dar jerarquía clara: sin
      // esto PrimeNG pinta los dos botones idénticos.
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutar(accion, id),
    });
  }

  /** Descarga el PDF del documento. */
  protected onImprimir(): void {
    const id = this.documentoId();
    if (id === null || this.enCurso() !== null) return;
    this.enCurso.set('imprimir');
    this.gateway
      .imprimir(this.document(), id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.enCurso.set(null),
        error: (err: unknown) => {
          this.enCurso.set(null);
          const ts = this.t().documentActions.detail.toasts.imprimirError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  /** Llama al backend, avisa y le pide a la ficha que recargue. */
  private ejecutar(accion: AccionEstado, id: number): void {
    this.enCurso.set(accion);
    this.llamada(accion, id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enCurso.set(null);
          const ts = this.t().documentActions.detail.toasts[`${accion}Success` as const];
          this.toast.success(ts.title, ts.desc);
          this.documentoChanged.emit();
        },
        error: (err: unknown) => {
          this.enCurso.set(null);
          const ts = this.t().documentActions.detail.toasts[`${accion}Error` as const];
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  private llamada(accion: AccionEstado, id: number): Observable<unknown> {
    const document = this.document();
    switch (accion) {
      case 'aprobar':
        return this.gateway.aprobar(document, id);
      case 'desaprobar':
        return this.gateway.desaprobar(document, id);
      case 'anular':
        return this.gateway.anular(document, id);
    }
  }
}

/** Normaliza el id de documento a número; `null` si no es un id utilizable. */
function toDocumentoId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}
