import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import { EMPRESA_CAMPOS } from '@erp/features/configuracion/configuracion.constants';
import type { ConfiguracionRead } from '@erp/features/configuracion/configuracion.model';
import { FacturaElectronicaService } from '../../factura-electronica.service';
import type { EmisorConsulta } from '../../factura-electronica.model';
import { parseRedEDocError, type RedEDocError } from '../../rededoc-error';

/**
 * Paso «RedEDoc»: el registro de la empresa como emisor.
 *
 * Dos tarjetas lado a lado: **la empresa** (lo que se guardó en el paso
 * anterior, que es lo que se va a enviar) y **el emisor** (si la empresa ya
 * existe en RedEDoc). De la segunda salen las acciones: crear si no está
 * creada; actualizar o desvincular si ya lo está.
 *
 * Cada acción termina releyendo el emisor, y «Siguiente» solo aparece con el
 * emisor creado: es lo que habilita el resto del asistente.
 *
 * Auto-contenido como el paso del certificado: carga, registra y solo avisa
 * hacia afuera cuando el usuario quiere avanzar.
 */
type AccionEmisor = 'crear' | 'actualizar' | 'desvincular' | 'reasignar';

/** Los datos que muestran las dos tarjetas, para pintarlas con la misma ficha. */
interface FichaEmisor {
  readonly razonSocial: string;
  readonly identificacion: string;
  readonly direccion: string;
  readonly telefono: string;
  readonly correo: string;
}

/** Identificación completa (`número-DV`). */
function conDigito(numero: string | null | undefined, dv: string | null | undefined): string {
  const digito = dv?.trim();
  return digito ? `${numero ?? ''}-${digito}` : (numero ?? '');
}

@Component({
  selector: 'app-rededoc-step',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, NgTemplateOutlet],
  providers: [ConfirmationService],
  templateUrl: './rededoc-step.component.html',
})
export class RededocStepComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  readonly avanzar = output<void>();

  protected readonly empresa = signal<Partial<ConfiguracionRead> | null>(null);
  protected readonly empresaLoading = signal(true);
  protected readonly empresaError = signal(false);

  protected readonly consulta = signal<EmisorConsulta | null>(null);
  protected readonly consultaLoading = signal(true);

  /** Mensaje de una consulta fallida; `null` si no falló. */
  protected readonly consultaError = signal<string | null>(null);

  /**
   * Acción en vuelo y cuál es, para poner en carga solo su botón. Guarda de
   * reentrada: dos clics no pueden crear dos emisores para la misma empresa.
   */
  protected readonly procesando = signal<AccionEmisor | null>(null);

  /**
   * Última acción que falló y por qué. Se queda en la tarjeta hasta el próximo
   * intento: es un motivo para leer con calma, no un aviso de paso.
   */
  protected readonly accionError = signal<{
    readonly accion: AccionEmisor;
    readonly error: RedEDocError;
  } | null>(null);

  /** La empresa tal como quedó guardada: lo que se envía a RedEDoc. */
  protected readonly fichaEmpresa = computed<FichaEmisor | null>(() => {
    const e = this.empresa();
    if (!e) return null;
    return {
      razonSocial: e.gen_empresa_razon_social ?? '',
      identificacion: conDigito(
        e.gen_empresa_numero_identificacion,
        e.gen_empresa_digito_verificacion,
      ),
      direccion: e.gen_empresa_direccion ?? '',
      telefono: e.gen_empresa_telefono ?? '',
      correo: e.gen_empresa_correo ?? '',
    };
  });

  /** El emisor tal como está en RedEDoc, con los mismos campos para compararlos. */
  protected readonly fichaEmisor = computed<FichaEmisor | null>(() => {
    const consulta = this.consulta();
    if (!consulta?.registrado) return null;
    const e = consulta.emisor;
    return {
      razonSocial: e.razon_social,
      identificacion: conDigito(e.numero_identificacion, e.digito_verificacion),
      direccion: e.direccion,
      telefono: e.telefono,
      correo: e.correo,
    };
  });

  constructor() {
    this.cargarEmpresa();
    this.consultar();
  }

  protected cargarEmpresa(): void {
    this.empresaLoading.set(true);
    this.empresaError.set(false);
    this.configuracion
      .obtener(EMPRESA_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.empresa.set(config);
          this.empresaLoading.set(false);
        },
        error: () => {
          this.empresaError.set(true);
          this.empresaLoading.set(false);
        },
      });
  }

  protected consultar(): void {
    // Con resultado previo (relectura tras una acción) no se vuelve al
    // esqueleto: la tarjeta cambia de estado sin parpadear.
    if (!this.consulta()) this.consultaLoading.set(true);
    this.consultaError.set(null);
    this.facturaElectronica
      .consultarEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (consulta) => {
          this.consulta.set(consulta);
          this.consultaLoading.set(false);
        },
        // El servicio apaga el toast del interceptor: el error se dice en la tarjeta.
        error: (err: unknown) => {
          this.consultaError.set(
            extractErrorMessage(err, this.t().facturacionElectronica.rededoc.emisor.error),
          );
          this.consultaLoading.set(false);
        },
      });
  }

  protected crear(): void {
    if (this.procesando()) return;
    this.iniciar('crear');
    this.facturaElectronica
      .crearEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminar(this.t().facturacionElectronica.rededoc.toasts.creado),
        error: (err: unknown) => this.fallo('crear', err),
      });
  }

  protected actualizar(): void {
    if (this.procesando()) return;
    this.iniciar('actualizar');
    this.facturaElectronica
      .actualizarEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminar(this.t().facturacionElectronica.rededoc.toasts.actualizado),
        error: (err: unknown) => this.fallo('actualizar', err),
      });
  }

  /**
   * Emisor que se puede reasignar: el crear chocó con uno que ya existe con la
   * misma identificación. Sin `emisor_id` no hay a cuál apuntar.
   */
  protected readonly emisorReasignable = computed(() => {
    const fallo = this.accionError();
    if (!fallo || fallo.accion !== 'crear') return null;
    return fallo.error.codigos.includes('emisor_duplicado') ? fallo.error.emisorId : null;
  });

  /** Reasignar se trae un emisor que ya existe: se confirma antes. */
  protected confirmarReasignar(): void {
    const emisor = this.emisorReasignable();
    if (this.procesando() || emisor === null) return;
    const confirm = this.t().facturacionElectronica.rededoc.confirmReasignar;
    this.confirmation.confirm({
      header: confirm.header,
      message: confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      accept: () => this.reasignar(emisor),
    });
  }

  private reasignar(emisor: number): void {
    this.iniciar('reasignar');
    this.facturaElectronica
      .reasignarEmisor(emisor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminar(this.t().facturacionElectronica.rededoc.toasts.reasignado),
        error: (err: unknown) => this.fallo('reasignar', err),
      });
  }

  /** Desvincular deja a la empresa sin poder facturar: se confirma antes. */
  protected confirmarDesvincular(): void {
    if (this.procesando()) return;
    const confirm = this.t().facturacionElectronica.rededoc.confirmDesvincular;
    this.confirmation.confirm({
      header: confirm.header,
      message: confirm.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: confirm.accept,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.desvincular(),
    });
  }

  private desvincular(): void {
    this.iniciar('desvincular');
    this.facturaElectronica
      .desvincularEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.terminar(this.t().facturacionElectronica.rededoc.toasts.desvinculado),
        error: (err: unknown) => this.fallo('desvincular', err),
      });
  }

  private iniciar(accion: AccionEmisor): void {
    this.procesando.set(accion);
    this.accionError.set(null);
  }

  private fallo(accion: AccionEmisor, err: unknown): void {
    this.procesando.set(null);
    const fallback = this.t().facturacionElectronica.rededoc.errorAccion.generico;
    this.accionError.set({ accion, error: parseRedEDocError(err, fallback) });
  }

  /** Avisa y relee el emisor: de su estado salen los botones que siguen. */
  private terminar(toast: { title: string; desc: string }): void {
    this.procesando.set(null);
    this.toast.success(toast.title, toast.desc);
    this.consultar();
  }
}
