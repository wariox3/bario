import {
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, type Observable, defer, filter, from, switchMap } from 'rxjs';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogService } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { type ErpSelectOption, I18nService, SELECT_ENDPOINTS, ToastService } from '@reddoc/core';
import {
  DocumentoDetalleService,
  type AgregarDocumentoModalData,
  type CarteraTipo,
  type DocumentoPendienteApi,
} from '@erp/core/module-config';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import {
  ErpApiSelectComponent,
  ErpContactoSelectComponent,
  PegarNumeroDirective,
} from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { LineasDiferidas } from '../../../lineas-diferidas';
import {
  createCuentaDetalleGroup,
  type CuentaDetalleGroup,
} from '../../contable-documento-detalle.form';
import {
  calcularResumenContable,
  cuentaDetalleToFormValue,
  cuentaDetalleToPayload,
  documentoPendienteToFormValue,
} from '../../contable-documento-detalle.mapper';
import type { CuentaDetalleRead } from '../../contable-documento-detalle.model';
import type {
  CuentaDetalleFormRawValue,
  NaturalezaCuenta,
} from '../../contable-documento-detalle.types';
import { CrearTerceroDirective } from '@erp/features/general/masters/contacto/crear-tercero.directive';

/** Columnas fijas: nº, cuenta, naturaleza, valor y acciones. */
const BASE_COLUMN_COUNT = 5;

/**
 * Tabla de **líneas de cuenta contable** (asientos manuales) de un documento.
 * Espeja `ComercialDocumentoDetallesComponent` pero sin ítems ni impuestos:
 * cuenta + naturaleza (D/C) + valor, con el acumulado de débitos/créditos.
 *
 * Las columnas `contacto`, `centro_costo`, `base`, `numero` y `detalle` son
 * **opt-in** (`showContacto`, `showCentroCosto`, `showBase`, `showNumero`,
 * `showDetalle`): un documento las pide solo si su negocio las imputa —el pago pide
 * tercero y centro de costo, el asiento contable suma número y glosa—. El
 * `FormGroup` siempre las tiene, así que prenderlas no cambia el shape de la línea
 * ni el mapper.
 *
 * Persistencia idéntica a la familia comercial (`LineasDiferidas`): en **alta**
 * (`documentId == null`) las líneas viven en el `FormArray` y viajan embebidas al
 * crear el documento. En **edición** van por `/documento-detalle`, pero la tabla no
 * guarda nada por su cuenta: altas, ediciones, bajas y documentos agregados quedan
 * pendientes y los persiste `saveAll()` cuando el form padre guarda el documento.
 * Un solo botón "Guardar" confirma todo; "Volver" lo descarta. Expone la misma API
 * pública (`saveAll`, `pendingCount`, `hasInvalidPending`, `ocupado`) para que el
 * form padre orqueste ítems y cuentas por igual.
 *
 * Con `agregarDocumentoEnabled` la tabla ofrece además **agregar documento**
 * (cruce de cartera): un modal de documentos con saldo pendiente cuya selección
 * entra como líneas enlazadas (`documento_afectado`, cuenta/naturaleza
 * bloqueadas, valor = pendiente). Espejo del "importar desde documento" comercial.
 */
@Component({
  selector: 'app-contable-documento-detalles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    PegarNumeroDirective,
    InputTextModule,
    SelectModule,
    TooltipModule,
    ConfirmDialogModule,
    ErpCuentaSelectComponent,
    ErpContactoSelectComponent,
    CrearTerceroDirective,
    ErpApiSelectComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './contable-documento-detalles.component.html',
  styleUrl: './contable-documento-detalles.component.scss',
})
export class ContableDocumentoDetallesComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  protected readonly t = this.i18n.t;

  /** Selects de cuenta de la tabla, en el orden de las filas. */
  private readonly cuentaSelects = viewChildren(ErpCuentaSelectComponent);

  /** FormArray de líneas de cuenta, propiedad del form padre. */
  readonly detalles = input.required<FormArray<CuentaDetalleGroup>>();

  /**
   * Id del documento en edición (`null` en alta). Cuando existe, las líneas
   * transaccionan al instante contra `/documento-detalle`.
   */
  readonly documentId = input<number | null>(null);

  /** Muestra la columna de tercero por línea (la imputa el pago; la factura no). */
  readonly showContacto = input<boolean>(false);

  /**
   * Tercero con el que nace cada línea nueva. Lo decide el documento padre —el
   * pago siembra el de su cabecera—; la tabla solo lo aplica al agregar.
   */
  readonly contactoPorDefecto = input<ErpSelectOption | null>(null);

  /**
   * Muestra la columna de centro de costo. Es lo que el ERP anterior llamaba
   * "grupo" (de contabilidad) en el asiento y el cierre.
   */
  readonly showCentroCosto = input<boolean>(false);

  /**
   * Centro de costo con el que nace cada línea nueva. Mismo rol que
   * `contactoPorDefecto`: el asiento siembra el de su cabecera.
   */
  readonly centroCostoPorDefecto = input<ErpSelectOption | null>(null);

  /**
   * Naturaleza con la que nace cada línea nueva. Débito salvo que el documento
   * diga otra cosa: el egreso arranca en crédito.
   */
  readonly naturalezaPorDefecto = input<NaturalezaCuenta>('D');

  /** Muestra la columna de base gravable. */
  readonly showBase = input<boolean>(false);

  /** Muestra la columna de número de referencia de la línea (la imputa el asiento). */
  readonly showNumero = input<boolean>(false);

  /** Muestra la columna de glosa libre de la línea. */
  readonly showDetalle = input<boolean>(false);

  /**
   * Suma la fila "Total" (el neto según `carteraTipo`) al resumen. Solo tiene
   * sentido donde el neto es el documento —un recaudo o un desembolso—, no en
   * una pestaña de asientos.
   */
  readonly showTotal = input<boolean>(false);

  /**
   * Marca la diferencia en el resumen cuando débitos y créditos no coinciden. La
   * pide el asiento contable, donde cuadrar es la regla del documento.
   */
  readonly showDescuadre = input<boolean>(false);

  /**
   * Habilita el "agregar documento" (cruce de cartera): suma a la barra un botón
   * propio que trae documentos pendientes como líneas enlazadas. Lo prende cada
   * documento que cruza cartera (pago, egreso).
   */
  readonly agregarDocumentoEnabled = input<boolean>(false);

  /**
   * Familia de cartera del documento: CxC en el pago, CxP en el egreso. Acota
   * los pendientes del cruce y fija el signo del neto del resumen.
   */
  readonly carteraTipo = input<CarteraTipo>('cobrar');

  /**
   * Contacto de la cabecera (id). Acota los documentos pendientes del modal a
   * ese tercero; sin contacto el botón queda deshabilitado con su tooltip.
   */
  readonly contactoId = input<number | null>(null);

  /** Muestra la columna "Documento" (tipo + número del cruce) de las líneas enlazadas. */
  readonly showDocumento = input<boolean>(false);

  /** Endpoint del catálogo de centros de costo (columna `centro_costo`). */
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;

  /** Nº de columnas de la tabla; alimenta el `colspan` del estado vacío. */
  protected readonly columnCount = computed(
    () =>
      BASE_COLUMN_COUNT +
      [
        this.showNumero(),
        this.showDocumento(),
        this.showContacto(),
        this.showCentroCosto(),
        this.showBase(),
        this.showDetalle(),
      ].filter(Boolean).length,
  );

  /** Opciones del select de naturaleza (D/C), con etiquetas i18n. */
  protected readonly naturalezaOptions = computed(() => [
    { label: this.t().entities.cuentaDetalle.naturaleza.debito, value: 'D' as const },
    { label: this.t().entities.cuentaDetalle.naturaleza.credito, value: 'C' as const },
  ]);

  /** Espejo reactivo del valor del array para la tabla y el resumen. */
  protected readonly lines = signal<readonly CuentaDetalleFormRawValue[]>([]);

  /** Hay al menos una línea: la página pinta el resumen solo entonces. */
  readonly hayLineas = computed(() => this.lines().length > 0);

  /**
   * Acumulado de débitos/créditos; el signo del neto lo fija la familia de cartera.
   * Público: la página lo pinta fuera de la card de líneas, leyéndolo por
   * referencia de plantilla (`#detallesTabla`).
   */
  readonly resumen = computed(() => calcularResumenContable(this.lines(), this.carteraTipo()));

  /**
   * Altas, ediciones y bajas pendientes de la edición: la tabla no escribe nada por
   * su cuenta, las persiste `saveAll()` cuando el form padre guarda el documento.
   */
  private readonly lineas = new LineasDiferidas<CuentaDetalleGroup, CuentaDetalleRead>({
    detalles: () => this.detalles(),
    documentId: () => this.documentId(),
    service: this.detalleService,
    tieneContenido: (fila) => fila.controls.cuenta.value != null,
    payload: (fila) => cuentaDetalleToPayload(fila.getRawValue()),
    reconstruir: (leida) => createCuentaDetalleGroup(cuentaDetalleToFormValue(leida)),
  });

  /**
   * Hay un guardado de líneas en curso. El form padre deshabilita "Guardar" mientras
   * tanto: guardar a la vez reenviaría líneas que aún no tienen `id`.
   */
  readonly ocupado = computed(() => this.lineas.guardando());

  /**
   * `true` desde que el effect de sincronización corrió, es decir, con los inputs ya
   * asignados. El form padre pide `pendingCount()` desde su barra de acciones, que se
   * evalúa antes que esta tabla (va más abajo en la plantilla): leer el input
   * obligatorio en ese momento lanza NG0950. Al montar no hay nada pendiente.
   */
  private readonly montada = signal(false);

  constructor() {
    effect((onCleanup) => {
      const array = this.detalles();
      this.montada.set(true);
      const sync = (): void => this.lines.set(array.getRawValue());
      sync();
      const sub = array.valueChanges.subscribe(sync);
      onCleanup(() => sub.unsubscribe());
    });
  }

  /**
   * Agrega una línea manual y enfoca su cuenta, que al enfocarse despliega la
   * lista: lo siguiente que hace la persona es elegirla. La fila nueva es la
   * última, así que su select es el último de la tabla una vez pintada.
   */
  protected addLinea(): void {
    this.detalles().push(
      createCuentaDetalleGroup({
        contacto: this.contactoPorDefecto(),
        centro_costo: this.centroCostoPorDefecto(),
        naturaleza: this.naturalezaPorDefecto(),
      }),
    );
    afterNextRender(() => this.cuentaSelects().at(-1)?.focus(), { injector: this.injector });
  }

  /**
   * Abre el modal de "agregar documento" (lazy) y, con los documentos
   * seleccionados, arma las líneas de cruce y las agrega. El modal solo
   * selecciona; toda la resolución/persistencia ocurre aquí.
   */
  protected openAgregarDocumento(): void {
    const data: AgregarDocumentoModalData = {
      contactoId: this.contactoId(),
      carteraTipo: this.carteraTipo(),
    };

    from(
      import('@erp/core/module-config/agregar-documento/components/agregar-documento-modal/agregar-documento-modal.component'),
    )
      .pipe(
        switchMap(({ AgregarDocumentoModalComponent }) => {
          const ref = this.dialog.open(AgregarDocumentoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '82rem',
            data,
          });
          return ref ? ref.onClose : EMPTY;
        }),
        // El modal cierra con `null` al cancelar: solo seguimos con filas reales.
        filter(
          (rows: unknown): rows is DocumentoPendienteApi[] =>
            Array.isArray(rows) && rows.length > 0,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rows) => this.resolveAndAddDocumentos(rows));
  }

  /**
   * Agrega las líneas enlazadas de los documentos seleccionados. En edición quedan
   * pendientes como cualquier alta: se escriben al guardar el documento. La cuenta y
   * la naturaleza del cruce salen de la propia fila: el listado ya las trae resueltas.
   */
  private resolveAndAddDocumentos(rows: readonly DocumentoPendienteApi[]): void {
    for (const row of rows) {
      this.detalles().push(
        createCuentaDetalleGroup(documentoPendienteToFormValue(row, this.carteraTipo())),
      );
    }
    const toast = this.t().documentAdd.toasts.addSuccess;
    this.toast.success(toast.title, toast.desc);
  }

  /** Pide confirmación y, al aceptar, quita la línea (en edición, al guardar). */
  protected removeLinea(group: CuentaDetalleGroup): void {
    this.confirmation.confirm({
      message: this.t().entities.cuentaDetalle.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.lineas.quitar(group),
    });
  }

  /** La fila tiene cambios sin guardar (nueva con cuenta, o persistida y editada). */
  protected isPending(group: CuentaDetalleGroup): boolean {
    return this.lineas.esPendiente(group);
  }

  /**
   * Nº de cambios sin guardar: filas nuevas o editadas más las quitadas. Alimenta el
   * aviso del toolbar, el del form padre y el guard de salida.
   */
  pendingCount(): number {
    if (!this.montada()) return 0;
    return this.lineas.pendingCount();
  }

  /** `true` si alguna línea pendiente está incompleta (p. ej. sin cuenta o sin valor). */
  hasInvalidPending(): boolean {
    return this.lineas.hayIncompletas();
  }

  /**
   * Persiste todos los cambios pendientes (ver `LineasDiferidas.guardar`). Lo llama
   * el form padre al guardar el documento, antes de la cabecera.
   */
  saveAll(): Observable<void> {
    return defer(() => this.lineas.guardar()).pipe(takeUntilDestroyed(this.destroyRef));
  }
}
