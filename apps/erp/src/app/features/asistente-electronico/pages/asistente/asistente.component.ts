import { Component, computed, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { EmpresaConfigComponent } from '@erp/features/configuracion/components/empresa-config/empresa-config.component';
import { RededocStepComponent } from '../../steps/rededoc/rededoc-step.component';
import { CertificadoStepComponent } from '../../steps/certificado/certificado-step.component';
import { HabilitacionesStepComponent } from '../../steps/habilitaciones/habilitaciones-step.component';
import { FinalizarStepComponent } from '../../steps/finalizar/finalizar-step.component';
import type { AsistenteElectronicoModulo } from '@erp/core/services/parametro.service';
import { ASISTENTE_VARIANTES } from '../../asistente-variante';
import { AsistenteEstadoStore, type PasoVerificable } from '../../asistente-estado.store';
import {
  ASISTENTE_STEPS,
  type AsistenteStep,
  type AsistenteStepId,
} from '../../asistente.constants';

/**
 * Asistente electrónico de la empresa: facturación (venta) o nómina.
 *
 * Un solo componente para los dos: la variante llega por la ruta
 * (`data: { variante }`) y solo cambia el título, contra qué módulo se
 * consulta el software y cómo se cierra. Ver `asistente-variante.ts`.
 *
 * Orquesta el avance entre pasos; **no sabe nada de formularios**. Cada paso es
 * un componente auto-contenido que carga y guarda lo suyo y avisa con un output
 * cuando terminó — el asistente solo decide a dónde ir después. Por eso el paso
 * «Datos de la empresa» es el `EmpresaConfigComponent` de Configuración tal
 * cual, sin copiar su formulario.
 */
@Component({
  selector: 'app-asistente-electronico',
  standalone: true,
  imports: [
    EmpresaConfigComponent,
    RededocStepComponent,
    CertificadoStepComponent,
    HabilitacionesStepComponent,
    FinalizarStepComponent,
  ],
  templateUrl: './asistente.component.html',
  providers: [AsistenteEstadoStore],
  // Ancho acotado como Configuración: son formularios, no tablas. La grilla de
  // dos columnas la arma el template; el host solo centra y acota.
  host: { class: 'mx-auto block w-full max-w-[1200px]' },
})
export class AsistenteComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly estado = inject(AsistenteEstadoStore);

  protected readonly t = this.i18n.t;
  protected readonly steps = ASISTENTE_STEPS;

  /** Qué asistente es (route data); por defecto, el de facturación. */
  readonly variante = input<AsistenteElectronicoModulo>('venta');
  protected readonly config = computed(() => ASISTENTE_VARIANTES[this.variante()]);
  protected readonly textos = computed(
    () => this.t().asistenteElectronico.variantes[this.variante()],
  );

  /** Paso activo (query-param `?paso=`); por defecto, el primero. */
  readonly paso = input<string>();

  protected readonly activeStep = computed<AsistenteStep>(
    () => ASISTENTE_STEPS.find((step) => step.id === this.paso()) ?? ASISTENTE_STEPS[0],
  );

  constructor() {
    // El check de cada paso sale del backend (ver `AsistenteEstadoStore`), no
    // de lo que se hizo en esta pantalla: sobrevive a recargar y se cae si algo
    // se deshace. Se comprueba al entrar y con cada variante.
    effect(() => this.estado.iniciar(this.config()));
  }

  protected isCompletado(id: AsistenteStepId): boolean {
    return this.estado.completados().has(id);
  }

  /** Un paso cambió algo en el backend: se vuelve a comprobar su check. */
  protected onCambio(...pasos: readonly PasoVerificable[]): void {
    pasos.forEach((paso) => this.estado.refrescar(paso));
  }

  protected isActivo(id: AsistenteStepId): boolean {
    return this.activeStep().id === id;
  }

  /** Rótulo del botón de guardar del paso: solo promete continuar si hay a dónde. */
  protected readonly submitLabel = computed(() =>
    this.siguienteDe(this.activeStep().id)
      ? this.t().asistenteElectronico.asistente.actions.guardarYContinuar
      : this.t().configuracion.actions.save,
  );

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
   * Cualquier paso es alcanzable: el riel no sabe qué necesita cada uno. Cada
   * paso valida su propio requisito contra el backend y, si falta, lo dice y
   * ofrece volver (el certificado sin emisor manda a RedEDoc). Así un salto
   * desde el riel, un enlace con `?paso=` o un reload caen en el mismo lugar.
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
