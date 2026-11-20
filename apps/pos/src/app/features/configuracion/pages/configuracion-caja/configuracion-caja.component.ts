import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { type Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import {
  ConfiguracionUsuarioStore,
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
import { ConfiguracionCajaStore, type OperacionUsuario } from '../../configuracion-caja.store';
import { POS_DOCUMENTO_TIPOS, type PosDocumentoTipoId } from '../../configuracion-caja.model';
import { ConfiguracionEmpresaService } from '../../configuracion-empresa.service';

/** Tope de cada texto de la tirilla: el mismo que el ERP da a los de la factura. */
const TIRILLA_MAX = 2000;

type EstadoTirilla = 'cargando' | 'listo' | 'error';

/**
 * Configuración de la caja: con qué tipo de documento factura, de qué almacén
 * sale la mercancía, sede, caja y asesor por defecto. La cuenta de cada cobro no
 * se configura: el cobro la toma del tipo de cuenta bancaria del medio de pago.
 *
 * - El tipo de documento y los textos de la tirilla son de la empresa: cambiarlos
 *   aquí los cambia para todas sus cajas.
 * - Almacén, sede y caja son del usuario (`ConfiguracionUsuarioStore`, la misma
 *   que edita el ERP). La caja tiene que ser de la sede: su catálogo se acota por
 *   `sede_id` y cambiar la sede la vacía.
 * - El asesor se guarda en este dispositivo.
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
  private readonly usuario = inject(ConfiguracionUsuarioStore);
  private readonly empresa = inject(ConfiguracionEmpresaService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly estadoTipo = this.store.estadoTipo;
  protected readonly estadoUsuario = this.usuario.estado;
  protected readonly guardando = signal(false);
  protected readonly estadoTirilla = signal<EstadoTirilla>('cargando');
  protected readonly tirillaMax = TIRILLA_MAX;

  protected readonly tipos = POS_DOCUMENTO_TIPOS;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly sedeEndpoint = SELECT_ENDPOINTS.sede;
  protected readonly cajaEndpoint = SELECT_ENDPOINTS.caja;

  protected readonly form = this.fb.group({
    documentoTipoId: this.fb.control<PosDocumentoTipoId | null>(null, Validators.required),
    almacen: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    sede: this.fb.control<ErpSelectOption | null>(null),
    caja: this.fb.control<ErpSelectOption | null>(null),
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
   * Sin almacén configurado se toma el primero, como el ERP en sus documentos: lo
   * habitual es tener uno solo. Si ya hay uno, manda ese.
   */
  protected readonly almacenSugerido = computed(() =>
    this.store.configuracion().almacen ? null : 0,
  );

  /** Sede vigente del form; acota el catálogo de cajas. */
  private readonly sede = signal<ErpSelectOption | null>(null);
  protected readonly cajaParams = computed((): Record<string, string> => {
    const sede = this.sede();
    return sede ? { sede_id: String(sede.id) } : {};
  });

  constructor() {
    this.form.controls.asesor.setValue(this.store.configuracion().asesor);
    this.cargarTirilla();

    // Solo el cambio de la persona vacía la caja: la carga parcha con `emitEvent: false`.
    this.form.controls.sede.valueChanges.pipe(takeUntilDestroyed()).subscribe((sede) => {
      this.sede.set(sede);
      this.form.controls.caja.setValue(null);
    });

    // Almacén, sede y caja llegan con la configuración del usuario. Mientras carga
    // van deshabilitados; si falla, quedan con el respaldo del navegador.
    const operacion = [
      this.form.controls.almacen,
      this.form.controls.sede,
      this.form.controls.caja,
    ] as const;
    effect(() => {
      const estado = this.estadoUsuario();
      untracked(() => {
        if (estado === 'cargando') {
          operacion.forEach((c) => c.disable({ emitEvent: false }));
          return;
        }
        if (operacion.every((c) => c.pristine)) this.aplicarOperacion();
        operacion.forEach((c) => c.enable({ emitEvent: false }));
      });
    });

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

  protected recargarUsuario(): void {
    this.store.recargar();
  }

  private aplicarOperacion(): void {
    const config = this.store.configuracion();
    const valor: OperacionUsuario = {
      almacen: config.almacen,
      sede: config.sede,
      caja: this.usuario.caja(),
    };
    this.form.patchValue(valor, { emitEvent: false });
    this.sede.set(valor.sede);
  }

  /**
   * Hay que guardar almacén, sede o caja si difieren de lo que el usuario tiene
   * en el backend. Se compara contra el backend y no con `dirty`: los que vienen
   * del respaldo del navegador se suben al guardar aunque no se hayan tocado.
   */
  private operacionPendiente(operacion: OperacionUsuario): boolean {
    if (this.form.controls.almacen.disabled) return false;
    const actual = this.usuario.config();
    return (
      (operacion.almacen?.id ?? null) !== (actual?.almacen ?? null) ||
      (operacion.sede?.id ?? null) !== (actual?.sede ?? null) ||
      (operacion.caja?.id ?? null) !== (actual?.caja ?? null)
    );
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
    const { documentoTipoId, almacen, sede, caja, asesor } = this.form.getRawValue();
    // El selector de asesor trae `nombre_corto`, no `nombre`: se normaliza para
    // que la opción guardada tenga la forma `{ id, nombre }` de las demás.
    this.store.guardarAsesor(asesor ? { id: asesor.id, nombre: asesorLabel(asesor) } : null);
    const operacion: OperacionUsuario = { almacen, sede, caja };

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
    if (this.operacionPendiente(operacion)) {
      remotos.push(
        this.alBackend(
          this.store.guardarOperacion(operacion),
          () => {
            this.form.controls.almacen.markAsPristine();
            this.form.controls.sede.markAsPristine();
            this.form.controls.caja.markAsPristine();
          },
          this.t().configuracion.toasts.operacionError,
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
