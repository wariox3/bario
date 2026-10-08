import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Observable, Subscription } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import { EMPRESA_CAMPOS } from '@erp/features/configuracion/configuracion.constants';
import type { ConfiguracionRead } from '@erp/features/configuracion/configuracion.model';
import { ElectronicoService } from '../../electronico.service';
import type { EmisorConsulta } from '../../electronico.model';
import { parseRedEDocError, tieneCodigo, type RedEDocError } from '../../rededoc-error';
import { RededocErrorComponent } from '../../components/rededoc-error/rededoc-error.component';
import { EstadoErrorComponent } from '../../components/estado-error/estado-error.component';
import { confirmacion } from '../../confirmacion';

/**
 * Paso «RedEDoc»: el registro de la empresa como emisor.
 *
 * Dos tarjetas lado a lado: **la empresa** (lo que se guardó en el paso
 * anterior, que es lo que se va a enviar) y **el emisor** (si la empresa ya
 * existe en RedEDoc). De la segunda salen las acciones: crear si no está
 * creada; actualizar o desvincular si ya lo está.
 *
 * Cada acción termina releyendo el emisor, y «Continuar» solo aparece con el
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
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    NgTemplateOutlet,
    RededocErrorComponent,
    EstadoErrorComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './rededoc-step.component.html',
})
export class RededocStepComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly electronico = inject(ElectronicoService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  /** Atajo al diccionario del paso. */
  private readonly dict = computed(() => this.t().asistenteElectronico.rededoc);

  readonly avanzar = output<void>();
  /** Cambió el emisor en RedEDoc (crear, actualizar, desvincular, reasignar). */
  readonly cambio = output<void>();

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

  /**
   * Lecturas en vuelo. Cada relectura cancela la anterior: con dos «Reintentar»
   * seguidos, o una relectura tras una acción mientras otra seguía en camino,
   * ganaría la respuesta que llegue última y no la más reciente.
   */
  private empresaSub?: Subscription;
  private consultaSub?: Subscription;

  constructor() {
    this.cargarEmpresa();
    this.consultar();
  }

  protected cargarEmpresa(): void {
    this.empresaLoading.set(true);
    this.empresaError.set(false);
    this.empresaSub?.unsubscribe();
    this.empresaSub = this.configuracion
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
    this.consultaSub?.unsubscribe();
    this.consultaSub = this.electronico
      .consultarEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (consulta) => {
          this.consulta.set(consulta);
          this.consultaLoading.set(false);
        },
        // El servicio apaga el toast del interceptor: el error se dice en la tarjeta.
        error: (err: unknown) => {
          this.consultaError.set(extractErrorMessage(err, this.dict().emisor.error));
          this.consultaLoading.set(false);
        },
      });
  }

  protected crear(): void {
    this.ejecutar('crear', this.electronico.crearEmisor(), this.dict().toasts.creado);
  }

  protected actualizar(): void {
    this.ejecutar(
      'actualizar',
      this.electronico.actualizarEmisor(),
      this.dict().toasts.actualizado,
    );
  }

  /**
   * Emisor que se puede reasignar: el crear chocó con uno que ya existe con la
   * misma identificación. Sin `emisor_id` no hay a cuál apuntar.
   */
  protected readonly emisorReasignable = computed(() => {
    const fallo = this.accionError();
    if (!fallo || fallo.accion !== 'crear') return null;
    return tieneCodigo(fallo.error, 'emisor_duplicado') ? fallo.error.emisorId : null;
  });

  /** Reasignar se trae un emisor que ya existe: se confirma antes. */
  protected confirmarReasignar(): void {
    const emisor = this.emisorReasignable();
    if (this.procesando() || emisor === null) return;
    this.confirmation.confirm(
      confirmacion(this.dict().confirmReasignar, this.t().common.actions.cancel, () =>
        this.ejecutar(
          'reasignar',
          this.electronico.reasignarEmisor(emisor),
          this.dict().toasts.reasignado,
        ),
      ),
    );
  }

  /** Desvincular deja a la empresa sin poder facturar: se confirma antes. */
  protected confirmarDesvincular(): void {
    if (this.procesando()) return;
    this.confirmation.confirm(
      confirmacion(
        this.dict().confirmDesvincular,
        this.t().common.actions.cancel,
        () =>
          this.ejecutar(
            'desvincular',
            this.electronico.desvincularEmisor(),
            this.dict().toasts.desvinculado,
          ),
        { destructiva: true },
      ),
    );
  }

  /**
   * Corre una acción sobre el emisor: la marca en vuelo (guarda de reentrada:
   * dos clics no crean dos emisores), y al terminar avisa y relee el emisor —de
   * su estado salen los botones que siguen— o deja el error en la tarjeta.
   */
  private ejecutar(
    accion: AccionEmisor,
    peticion: Observable<void>,
    exito: { readonly title: string; readonly desc: string },
  ): void {
    if (this.procesando()) return;
    this.procesando.set(accion);
    this.accionError.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.procesando.set(null);
        this.toast.success(exito.title, exito.desc);
        this.consultar();
        this.cambio.emit();
      },
      error: (err: unknown) => {
        this.procesando.set(null);
        this.accionError.set({
          accion,
          error: parseRedEDocError(err, this.dict().errorAccion.generico),
        });
      },
    });
  }
}
