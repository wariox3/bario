import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { I18nService, extractErrorMessage } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ElectronicoService } from '../../electronico.service';
import type { SoftwareModulo, SoftwareRedEDoc, SoftwareTipo } from '../../electronico.model';
import { TIPOS_POR_MODULO } from '../../software.constants';
import { EstadoErrorComponent } from '../../components/estado-error/estado-error.component';
import { SoftwareCardComponent } from '../../components/software-card/software-card.component';
import { SoftwareDialogComponent } from '../../components/software-dialog/software-dialog.component';

/**
 * Paso «Habilitaciones»: el software de cada tipo de documento ante la DIAN.
 *
 * Una tarjeta por tipo del módulo (facturación: factura y documento
 * equivalente POS), siempre, haya o no software: la consulta solo las rellena.
 * La que no tiene ofrece configurarlo y la que tiene, actualizarlo; las dos
 * cosas en el mismo modal.
 *
 * El módulo llega de la variante del asistente: facturación arma dos tarjetas
 * (factura y documento equivalente POS) y nómina, una.
 */
@Component({
  selector: 'app-habilitaciones-step',
  standalone: true,
  imports: [ButtonModule, EstadoErrorComponent, SoftwareCardComponent, SoftwareDialogComponent],
  templateUrl: './habilitaciones-step.component.html',
})
export class HabilitacionesStepComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly electronico = inject(ElectronicoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  /** Módulo de la variante: arma las tarjetas y es el `?modulo=` de la consulta. */
  readonly modulo = input.required<SoftwareModulo>();
  readonly avanzar = output<void>();
  /** Se creó o actualizó un software. */
  readonly cambio = output<void>();

  protected readonly software = signal<readonly SoftwareRedEDoc[] | null>(null);
  protected readonly loading = signal(true);
  /** Mensaje de una consulta fallida; `null` si no falló. */
  protected readonly consultaError = signal<string | null>(null);

  /** Lo que edita el modal: el tipo y, al actualizar, su software. */
  protected readonly tipoEnModal = signal<SoftwareTipo | null>(null);
  protected readonly softwareEnModal = signal<SoftwareRedEDoc | null>(null);
  protected readonly dialogVisible = signal(false);

  /** Una tarjeta por tipo del módulo, con su software si ya existe. */
  protected readonly tarjetas = computed(() => {
    const software = this.software() ?? [];
    return TIPOS_POR_MODULO[this.modulo()].map((tipo) => ({
      tipo,
      software: software.find((s) => s.tipo === tipo) ?? null,
    }));
  });

  /**
   * ¿Algún tipo del módulo tiene su set de pruebas configurado? Basta con uno
   * para «Continuar»: una empresa puede emitir solo facturas o solo POS.
   */
  protected readonly algunoConfigurado = computed(() =>
    this.tarjetas().some((tarjeta) => tarjeta.software !== null),
  );

  /** Lectura en vuelo; cada relectura cancela la anterior (gana la más reciente). */
  private consultaSub?: Subscription;

  constructor() {
    // En un effect y no directo en el constructor: ahí el input todavía no
    // llegó. Si cambiara el módulo, se relee contra el nuevo.
    effect(() => {
      this.modulo();
      untracked(() => {
        this.software.set(null);
        this.consultar();
      });
    });
  }

  protected consultar(): void {
    // Con resultado previo (relectura tras crear) no se vuelve al esqueleto.
    if (!this.software()) this.loading.set(true);
    this.consultaError.set(null);
    this.consultaSub?.unsubscribe();
    this.consultaSub = this.electronico
      .consultarSoftware(this.modulo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (software) => {
          this.software.set(software);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.consultaError.set(
            extractErrorMessage(err, this.t().asistenteElectronico.habilitaciones.consulta.error),
          );
          this.loading.set(false);
        },
      });
  }

  /** El modal guardó: se relee acá y se avisa al asistente. */
  protected onGuardado(): void {
    this.consultar();
    this.cambio.emit();
  }

  protected abrirCrear(tipo: SoftwareTipo): void {
    this.abrirModal(tipo, null);
  }

  protected abrirActualizar(software: SoftwareRedEDoc): void {
    this.abrirModal(software.tipo, software);
  }

  private abrirModal(tipo: SoftwareTipo, software: SoftwareRedEDoc | null): void {
    this.tipoEnModal.set(tipo);
    this.softwareEnModal.set(software);
    this.dialogVisible.set(true);
  }
}
