import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, of, switchMap, type Subscription } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { PasswordModule } from 'primeng/password';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import { I18nService, ToastService, formatFechaCorta, fromIsoDate } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { FacturaElectronicaService } from '../../factura-electronica.service';
import type { CertificadoRedEDoc } from '../../factura-electronica.model';
import { parseRedEDocError, type RedEDocError } from '../../rededoc-error';
import { RededocErrorComponent } from '../../components/rededoc-error/rededoc-error.component';
import { EstadoErrorComponent } from '../../components/estado-error/estado-error.component';
import { confirmacion } from '../../confirmacion';
import { FileDropzoneComponent } from '@erp/core/components/file-dropzone/file-dropzone.component';
import type { ArchivoRechazo } from '@erp/core/components/file-dropzone/validar-archivo';
import { FileCardComponent } from '@erp/core/components/file-card/file-card.component';

/** Estado del certificado del contenedor, del más urgente al más tranquilo. */
export type CertificadoEstado = 'sin-certificado' | 'vencido' | 'por-vencer' | 'vigente';

/** Días antes del vencimiento en los que ya se avisa. */
const DIAS_AVISO = 30;

/** Extensiones del certificado digital que emite la DIAN. */
const ACCEPT = '.p12,.pfx';
const MAX_MB = 5;

/** Días completos entre hoy y la fecha, negativo si ya pasó. */
function diasHasta(fecha: Date): number {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fecha.getTime() - desde.getTime()) / 86_400_000);
}

/**
 * Paso «Certificado digital» del asistente de facturación electrónica.
 *
 * Auto-contenido: consulta el certificado en RedEDoc
 * (`certificado-consultar/`), sube el archivo y lo relee. Solo avisa hacia
 * afuera cuando el usuario quiere avanzar, o volver a RedEDoc si falta el emisor.
 *
 * **Requisito:** el certificado es del emisor, así que sin emisor no hay nada
 * que consultar ni cargar. Se verifica acá y no en el riel: un salto desde el
 * riel, un enlace con `?paso=` o un reload caen en el mismo estado.
 *
 * Regla de negocio: **con un certificado cargado no se sube otro**, ni siquiera
 * vencido. La pantalla muestra el que hay; el color solo dice su urgencia. Para
 * cambiarlo hay que eliminarlo primero, y recién ahí vuelve la zona de carga.
 */
@Component({
  selector: 'app-certificado-step',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    ConfirmDialogModule,
    RededocErrorComponent,
    EstadoErrorComponent,
    FileDropzoneComponent,
    FileCardComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './certificado-step.component.html',
})
export class CertificadoStepComponent {
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly accept = ACCEPT;
  protected readonly maxMb = MAX_MB;

  /** El usuario terminó con este paso y quiere seguir. */
  readonly avanzar = output<void>();
  /** Falta el emisor: el usuario quiere ir a crearlo. */
  readonly irARededoc = output<void>();

  protected readonly loading = signal(true);
  protected readonly subiendo = signal(false);
  protected readonly eliminando = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal<string | null>(null);
  /** ¿La empresa ya es emisor en RedEDoc? `null` mientras no se sepa. */
  protected readonly emisorRegistrado = signal<boolean | null>(null);
  /** Certificado cargado en RedEDoc; `null` si todavía no hay ninguno. */
  protected readonly certificado = signal<CertificadoRedEDoc | null>(null);
  /**
   * La consulta falló. No se ofrece la carga a ciegas: si ya había un
   * certificado, la regla es no subir otro, así que se pide reintentar.
   */
  protected readonly consultaError = signal(false);

  /**
   * Última acción que falló y por qué, en la pantalla y no en un toast. Los
   * errores de la clave no llegan acá: van debajo de su campo.
   */
  protected readonly accionError = signal<{
    readonly accion: 'cargar' | 'eliminar';
    readonly error: RedEDocError;
  } | null>(null);

  /** Lectura en vuelo; cada relectura cancela la anterior (gana la más reciente). */
  private estadoSub?: Subscription;

  protected readonly form = this.fb.group({
    clave: this.fb.nonNullable.control('', Validators.required),
  });

  protected readonly venceDate = computed(() => fromIsoDate(this.certificado()?.vigente_hasta));

  protected readonly dias = computed(() => {
    const fecha = this.venceDate();
    return fecha ? diasHasta(fecha) : null;
  });

  protected readonly estado = computed<CertificadoEstado>(() => {
    const dias = this.dias();
    if (dias === null) return 'sin-certificado';
    if (dias < 0) return 'vencido';
    if (dias <= DIAS_AVISO) return 'por-vencer';
    return 'vigente';
  });

  /**
   * La zona de carga solo aparece cuando RedEDoc confirma que hay emisor y que
   * no hay certificado: ante la duda no se ofrece subir.
   */
  protected readonly puedeCargar = computed(
    () => !this.consultaError() && this.emisorRegistrado() === true && this.certificado() === null,
  );

  /**
   * Línea de apoyo de la tarjeta de archivo: la vigencia completa y, si el
   * certificado tiene alias (que entonces va de título), el archivo real.
   */
  protected readonly archivoMetaTexto = computed(() => {
    const cert = this.certificado();
    if (!cert) return '';
    const vigencia = this.t()
      .facturacionElectronica.certificado.detalle.vigencia.replace(
        '{desde}',
        formatFechaCorta(cert.vigente_desde, ''),
      )
      .replace('{hasta}', formatFechaCorta(cert.vigente_hasta, ''));
    return cert.alias ? `${cert.nombre_archivo} · ${vigencia}` : vigencia;
  });

  /** Fecha corta (`28/03/2027`): es una ficha, no la cabecera de un documento. */
  protected readonly venceTexto = computed(() => formatFechaCorta(this.venceDate(), ''));

  /** "faltan 205 días" / "venció hace 3 días", ya resuelto acá y no en el template. */
  protected readonly diasTexto = computed(() => {
    const dias = this.dias();
    if (dias === null) return '';
    const dict = this.t().facturacionElectronica.certificado.estado;
    if (dias < 0) {
      const abs = Math.abs(dias);
      return abs === 1
        ? dict.vencidoHace.one
        : dict.vencidoHace.other.replace('{dias}', String(abs));
    }
    if (dias === 0) return dict.venceHoy;
    return dias === 1 ? dict.faltan.one : dict.faltan.other.replace('{dias}', String(dias));
  });

  constructor() {
    this.cargarEstado();
  }

  protected cargarEstado(): void {
    this.loading.set(true);
    this.consultaError.set(false);
    this.estadoSub?.unsubscribe();
    this.estadoSub = this.facturaElectronica
      .consultarEmisor()
      .pipe(
        switchMap((emisor) =>
          emisor.registrado
            ? this.facturaElectronica
                .consultarCertificado()
                .pipe(map((certificado) => ({ registrado: true, certificado })))
            : of({ registrado: false, certificado: null }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ registrado, certificado }) => {
          this.emisorRegistrado.set(registrado);
          this.certificado.set(certificado);
          this.loading.set(false);
        },
        error: () => {
          this.consultaError.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Eliminar deja a la empresa sin poder emitir: se confirma antes. */
  protected confirmarEliminar(): void {
    if (this.eliminando()) return;
    this.confirmation.confirm(
      confirmacion(
        this.t().facturacionElectronica.certificado.confirmEliminar,
        this.t().common.actions.cancel,
        () => this.eliminar(),
        { destructiva: true },
      ),
    );
  }

  private eliminar(): void {
    this.eliminando.set(true);
    this.accionError.set(null);
    const toast = this.t().facturacionElectronica.certificado.toasts.eliminado;
    this.facturaElectronica
      .eliminarCertificado()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando.set(false);
          this.toast.success(toast.title, toast.desc);
          // Se relee en vez de vaciarlo a mano: que la zona de carga aparezca
          // porque RedEDoc confirma que ya no hay certificado.
          this.cargarEstado();
        },
        error: (err: unknown) => {
          this.eliminando.set(false);
          this.fallo('eliminar', err);
        },
      });
  }

  protected quitarArchivo(): void {
    if (this.subiendo()) return;
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  protected aceptarArchivo(file: File): void {
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  protected rechazarArchivo(motivo: ArchivoRechazo): void {
    const dict = this.t().facturacionElectronica.certificado.errors;
    this.selectedFile.set(null);
    this.fileError.set(
      motivo === 'tipo'
        ? dict.tipo.replace('{tipos}', ACCEPT)
        : dict.tamano.replace('{max}', String(MAX_MB)),
    );
  }

  protected onSubmit(): void {
    // El botón no se deshabilita por lo que falta (convención de formularios):
    // al intentar, se marca la clave y, si no hay archivo, se dice en la zona
    // de carga — sin pisar un error de tipo o tamaño que ya esté a la vista.
    const file = this.selectedFile();
    if (!file && !this.fileError()) {
      this.fileError.set(this.t().facturacionElectronica.certificado.errors.requerido);
    }
    if (!file || this.form.invalid || this.subiendo()) {
      this.form.markAllAsTouched();
      return;
    }
    this.subiendo.set(true);
    this.accionError.set(null);

    const dict = this.t().facturacionElectronica.certificado;
    this.facturaElectronica
      .cargarCertificado(file, this.form.getRawValue().clave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.subiendo.set(false);
          this.selectedFile.set(null);
          this.form.reset();
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
          // El vencimiento lo sabe el backend, no nosotros: se relee para que
          // la tarjeta muestre la fecha real del archivo recién subido.
          this.cargarEstado();
        },
        error: (err: unknown) => {
          this.subiendo.set(false);
          this.fallo('cargar', err);
        },
      });
  }

  /**
   * Reparte el error de RedEDoc. Una clave incorrecta es lo más probable y el
   * backend la señala con el prefijo `clave:`: esa va debajo de su campo (y se
   * borra sola al editarla); el resto, a la banda junto al botón.
   */
  private fallo(accion: 'cargar' | 'eliminar', err: unknown): void {
    const fallback = this.t().facturacionElectronica.certificado.errorAccion.generico;
    const error = parseRedEDocError(err, fallback);
    const deClave = error.detalles.filter((detalle) => detalle.campo === 'clave');
    if (accion === 'cargar' && deClave.length > 0) {
      const clave = this.form.controls.clave;
      clave.setErrors({ serverError: deClave.map((detalle) => detalle.mensaje).join(' ') });
      clave.markAsTouched();
      if (deClave.length === error.detalles.length) return;
      const resto = error.detalles.filter((detalle) => detalle.campo !== 'clave');
      this.accionError.set({
        accion,
        error: { ...error, detalles: resto, mensajes: resto.map((detalle) => detalle.mensaje) },
      });
      return;
    }
    this.accionError.set({ accion, error });
  }
}
