import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, ToastService } from '@reddoc/core';
import { ParametroService } from '@erp/core/services/parametro.service';
import { FacturaElectronicaService } from '../../factura-electronica.service';
import type { AppDict } from '@erp/i18n';
import { EmpresaConfigComponent } from '@erp/features/configuracion/components/empresa-config/empresa-config.component';
import type { EmpresaConfigFormValue } from '@erp/features/configuracion/configuracion.mapper';
import { CrearEmisorDialogComponent } from '../../components/crear-emisor-dialog/crear-emisor-dialog.component';
import {
  ASISTENTE_STEPS,
  type AsistenteStep,
  type AsistenteStepId,
} from '../../asistente.constants';

/**
 * Asistente de facturación electrónica.
 *
 * Orquesta el avance entre pasos; **no sabe nada de formularios**. Cada paso es
 * un componente auto-contenido que carga y guarda lo suyo y avisa con un output
 * cuando terminó — el asistente solo decide a dónde ir después. Por eso el paso
 * «Datos de la empresa» es el `EmpresaConfigComponent` de Configuración tal
 * cual, sin copiar su formulario.
 */
@Component({
  selector: 'app-asistente-facturacion-electronica',
  standalone: true,
  imports: [EmpresaConfigComponent, CrearEmisorDialogComponent, ButtonModule],
  templateUrl: './asistente.component.html',
  // Ancho acotado como Configuración: son formularios, no tablas. La grilla de
  // dos columnas la arma el template; el host solo centra y acota.
  host: { class: 'mx-auto block w-full max-w-[1200px]' },
})
export class AsistenteComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly parametro = inject(ParametroService);
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly steps = ASISTENTE_STEPS;

  /** Paso activo (query-param `?paso=`); por defecto, el primero. */
  readonly paso = input<string>();

  protected readonly activeStep = computed<AsistenteStep>(
    () => ASISTENTE_STEPS.find((step) => step.id === this.paso()) ?? ASISTENTE_STEPS[0],
  );

  /**
   * Pasos ya guardados en esta sesión del asistente.
   *
   * Es memoria de la pantalla, no del backend: hoy no hay endpoint que recuerde
   * el avance (el `terminar-asistente/` del ERP anterior no existe en la API
   * nueva). Sirve para que el riel muestre el visto tras guardar.
   */
  private readonly completados = signal<ReadonlySet<AsistenteStepId>>(new Set());

  /**
   * Emisor de facturación electrónica del contenedor
   * (`gen_factura_electronica_emisor`).
   *
   * Tres estados: `undefined` = sin consultar todavía o la consulta falló;
   * `null` = consultado y el contenedor no tiene emisor; un número = el emisor
   * con el que quedó habilitado.
   *
   * Se pide al entrar al paso «Datos de la empresa» y se refresca cada vez que
   * se vuelve a él: el valor puede cambiar mientras se recorre el asistente.
   */
  protected readonly emisor = signal<number | null | undefined>(undefined);

  constructor() {
    effect(() => {
      if (this.activeStep().id !== 'empresa') return;
      this.cargarEmisor();
    });
  }

  private cargarEmisor(): void {
    this.parametro
      .facturaElectronicaEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (emisor) => this.emisor.set(emisor),
        // Sin dato: se queda en `undefined`, que no es lo mismo que "no hay
        // emisor". Quien lo consuma tiene que poder distinguirlos.
        error: () => this.emisor.set(undefined),
      });
  }

  /**
   * ¿La empresa ya está dada de alta como emisor?
   *
   * Solo un id confirmado bloquea. `undefined` (sin consultar o consulta
   * fallida) deja el formulario editable: ante la duda, que el usuario pueda
   * trabajar — el backend rechaza igual si el alta ya existe.
   */
  protected readonly tieneEmisor = computed(() => typeof this.emisor() === 'number');

  protected isCompletado(id: AsistenteStepId): boolean {
    return this.completados().has(id);
  }

  protected isActivo(id: AsistenteStepId): boolean {
    return this.activeStep().id === id;
  }

  /** Rótulo del botón de guardar del paso: solo promete continuar si hay a dónde. */
  protected readonly submitLabel = computed(() =>
    this.siguienteDe(this.activeStep().id)
      ? this.t().facturacionElectronica.asistente.actions.guardarYContinuar
      : this.t().configuracion.actions.save,
  );

  /**
   * Alta de emisor en vuelo.
   *
   * Guarda de reentrada: entre que se acepta la confirmación y responde el
   * backend, el formulario vuelve a estar clickeable y un segundo submit
   * dispararía un segundo alta. Crear dos emisores para la misma empresa no es
   * algo que se arregle desde el front.
   */
  protected readonly registrando = signal(false);

  /** Datos recién guardados, para que la confirmación muestre qué se registra. */
  protected readonly datosGuardados = signal<EmpresaConfigFormValue | null>(null);

  /** Visibilidad del diálogo de alta de emisor. */
  protected readonly confirmVisible = signal(false);

  protected onStepSaved(id: AsistenteStepId, valor?: EmpresaConfigFormValue): void {
    this.completados.update((previos) => new Set(previos).add(id));

    // El paso de datos de la empresa no termina al guardar: con la
    // configuración ya persistida hay que dar de alta el emisor, que es lo
    // irreversible. Por eso se confirma acá y no antes de guardar — guardar se
    // puede deshacer editando; el alta no. Si el usuario cancela, sus datos
    // quedan guardados y editables y puede registrar cuando quiera.
    if (id === 'empresa' && !this.tieneEmisor()) {
      if (!this.registrando()) {
        this.datosGuardados.set(valor ?? null);
        this.confirmVisible.set(true);
      }
      return;
    }

    this.avanzarDesde(id);
  }

  protected crearEmisor(): void {
    if (this.registrando()) return;
    this.registrando.set(true);
    this.facturaElectronica
      .crearEmisor()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.registrando.set(false);
          this.confirmVisible.set(false);
          this.toast.success(
            this.t().facturacionElectronica.asistente.crearEmisor.toasts.success.title,
            this.t().facturacionElectronica.asistente.crearEmisor.toasts.success.desc,
          );
          // Releer el emisor antes de avanzar: es lo que deja el paso 1 en
          // solo lectura si el usuario vuelve.
          this.cargarEmisor();
          this.avanzarDesde('empresa');
        },
        // El error lo muestra el interceptor; el usuario se queda en el paso
        // con sus datos guardados y puede reintentar.
        error: () => this.registrando.set(false),
      });
  }

  protected avanzarDesde(id: AsistenteStepId): void {
    const siguiente = this.siguienteDe(id);
    if (siguiente) this.irA(siguiente.id);
  }

  private siguienteDe(id: AsistenteStepId): AsistenteStep | undefined {
    return ASISTENTE_STEPS[ASISTENTE_STEPS.findIndex((step) => step.id === id) + 1];
  }

  /**
   * Ir a un paso desde el riel.
   *
   * Hoy cualquier paso es alcanzable: los tres últimos son placeholders y el
   * sentido de tenerlos es poder recorrerlos. Cuando reciban contenido real hay
   * que cerrar el salto hacia adelante (alcanzable = completado, activo, o el
   * siguiente al último completado).
   */
  protected irA(id: AsistenteStepId): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { paso: id },
      queryParamsHandling: 'merge',
    });
  }

  protected translate(key: string): string {
    return this.i18n.translate(key);
  }
}
