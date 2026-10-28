import { Component, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { type Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import {
  CUENTA_BANCO_ENDPOINT,
  DOCUMENT_TYPE_ID,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  asesorLabel,
  extractErrorMessage,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  ErpApiSelectComponent,
  ErpAsesorSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
} from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../configuracion-caja.store';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from '../../configuracion-caja.model';
import { ConfiguracionEmpresaService } from '../../configuracion-empresa.service';

/** Tope de cada texto de la tirilla: el mismo que el ERP da a los de la factura. */
const TIRILLA_MAX = 2000;

type EstadoTirilla = 'cargando' | 'listo' | 'error';

/**
 * Configuración de la caja: con qué tipo de documento factura, de qué almacén
 * sale la mercancía, a qué cuentas entran el efectivo y las transferencias, y
 * sede y asesor por defecto.
 *
 * El tipo de documento y los textos de la tirilla son de la empresa y se guardan
 * en el backend: cambiarlos aquí los cambia para todas sus cajas. El resto se
 * guarda en este dispositivo.
 */
@Component({
  selector: 'app-configuracion-caja',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    RadioButtonModule,
    TextareaModule,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './configuracion-caja.component.html',
})
export class ConfiguracionCajaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ConfiguracionCajaStore);
  private readonly empresa = inject(ConfiguracionEmpresaService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly estadoTipo = this.store.estadoTipo;
  protected readonly guardando = signal(false);
  protected readonly estadoTirilla = signal<EstadoTirilla>('cargando');
  protected readonly tirillaMax = TIRILLA_MAX;

  protected readonly tipos = POS_DOCUMENTO_TIPOS;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly sedeEndpoint = SELECT_ENDPOINTS.sede;
  protected readonly cuentaEndpoint = CUENTA_BANCO_ENDPOINT;

  protected readonly form = this.fb.group({
    documentoTipoId: this.fb.control<PosDocumentoTipoId | null>(null, Validators.required),
    almacen: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuentaEfectivo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuentaTransferencia: this.fb.control<ErpSelectOption | null>(null),
    sede: this.fb.control<ErpSelectOption | null>(null),
    asesor: this.fb.control<ErpSelectOption | null>(null),
    tirilla: this.fb.nonNullable.group({
      superior: ['', Validators.maxLength(TIRILLA_MAX)],
      inferior: ['', Validators.maxLength(TIRILLA_MAX)],
    }),
  });

  /** Lo que se va escribiendo, para la vista previa de la tirilla. */
  protected readonly tirilla = toSignal(
    this.form.controls.tirilla.valueChanges.pipe(
      map(() => this.form.controls.tirilla.getRawValue()),
    ),
    { initialValue: this.form.controls.tirilla.getRawValue() },
  );

  /**
   * Una caja nueva toma el primer almacén, como el ERP en sus documentos: lo
   * habitual es tener uno solo. Si ya hay uno guardado, manda ese.
   */
  protected readonly almacenSugerido = this.store.configuracion().almacen ? null : 0;

  constructor() {
    this.form.patchValue(this.store.configuracion());
    this.cargarTirilla();

    // El tipo llega del backend después de pintar la página. Mientras carga (o si
    // falló) el control va deshabilitado: no se valida ni se guarda.
    const tipo = this.form.controls.documentoTipoId;
    effect(() => {
      const estado = this.estadoTipo();
      const valor = this.store.configuracion().documentoTipoId;
      untracked(() => {
        if (estado !== 'listo') {
          tipo.disable();
          return;
        }
        if (tipo.pristine) tipo.setValue(valor);
        tipo.enable();
      });
    });
  }

  protected recargarTipo(): void {
    this.store.recargarTipo();
  }

  /** Mientras carga (o si falló) la sección va deshabilitada: no se guarda en blanco. */
  protected cargarTirilla(): void {
    const tirilla = this.form.controls.tirilla;
    tirilla.disable();
    this.estadoTirilla.set('cargando');
    this.empresa
      .textosTirilla()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (textos) => {
          tirilla.reset(textos);
          tirilla.enable();
          this.estadoTirilla.set('listo');
        },
        error: () => this.estadoTirilla.set('error'),
      });
  }

  protected tipoLabel(tipo: PosDocumentoTipoId): string {
    const tipos = this.t().configuracion.tipos;
    return tipo === DOCUMENT_TYPE_ID.FACTURA_POS ? tipos.pos : tipos.posElectronica;
  }

  protected onSubmit(): void {
    if (this.guardando() || this.form.invalid) return;
    const { documentoTipoId, almacen, cuentaEfectivo, cuentaTransferencia, sede, asesor } =
      this.form.getRawValue();
    this.store.guardarLocal({
      almacen,
      cuentaEfectivo,
      cuentaTransferencia,
      sede,
      // El selector de asesor trae `nombre_corto`, no `nombre`: se normaliza para
      // que la opción guardada tenga la forma `{ id, nombre }` de las demás.
      asesor: asesor ? { id: asesor.id, nombre: asesorLabel(asesor) } : null,
    });

    const tipoControl = this.form.controls.documentoTipoId;
    const cambioTipo =
      tipoControl.enabled &&
      documentoTipoId !== null &&
      documentoTipoId !== this.store.configuracion().documentoTipoId;
    const tirillaControl = this.form.controls.tirilla;
    const cambioTirilla = tirillaControl.enabled && tirillaControl.dirty;

    // Lo de la empresa va al backend; cada parte avisa si falla y deja su
    // sección sucia para reintentar, sin deshacer la otra.
    const remotos: Observable<boolean>[] = [];
    if (cambioTipo) {
      remotos.push(
        this.alBackend(
          this.store.guardarTipo(documentoTipoId),
          () => {
            tipoControl.markAsPristine();
          },
          this.t().configuracion.toasts.tipoError,
        ),
      );
    }
    if (cambioTirilla) {
      remotos.push(
        this.alBackend(
          this.empresa.guardarTextosTirilla(tirillaControl.getRawValue()),
          (textos) => tirillaControl.reset(textos),
          this.t().configuracion.toasts.tirillaError,
        ),
      );
    }
    if (remotos.length === 0) {
      this.alGuardar();
      return;
    }

    this.guardando.set(true);
    forkJoin(remotos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultados) => {
        this.guardando.set(false);
        if (resultados.every(Boolean)) this.alGuardar();
      });
  }

  private alBackend<T>(
    peticion: Observable<T>,
    alGuardar: (valor: T) => void,
    tx: { title: string; desc: string },
  ): Observable<boolean> {
    return peticion.pipe(
      map((valor) => {
        alGuardar(valor);
        return true;
      }),
      catchError((err: unknown) => {
        this.toast.error(tx.title, extractErrorMessage(err, tx.desc));
        return of(false);
      }),
    );
  }

  private alGuardar(): void {
    this.form.markAsPristine();
    const ok = this.t().configuracion.toasts.guardada;
    this.toast.success(ok.title, ok.desc);
  }
}
