import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { EmpresaConfigComponent } from '@erp/features/configuracion/components/empresa-config/empresa-config.component';
import { RededocStepComponent } from '../../steps/rededoc/rededoc-step.component';
import { CertificadoStepComponent } from '../../steps/certificado/certificado-step.component';
import { HabilitacionesStepComponent } from '../../steps/habilitaciones/habilitaciones-step.component';
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
  imports: [
    EmpresaConfigComponent,
    RededocStepComponent,
    CertificadoStepComponent,
    HabilitacionesStepComponent,
  ],
  templateUrl: './asistente.component.html',
  // Ancho acotado como Configuración: son formularios, no tablas. La grilla de
  // dos columnas la arma el template; el host solo centra y acota.
  host: { class: 'mx-auto block w-full max-w-[1200px]' },
})
export class AsistenteComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

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

  protected onStepSaved(id: AsistenteStepId): void {
    this.completados.update((previos) => new Set(previos).add(id));
    this.avanzarDesde(id);
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
