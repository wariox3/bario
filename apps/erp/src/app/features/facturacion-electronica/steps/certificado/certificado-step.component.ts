import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { FieldErrorComponent } from '@reddoc/ui';
import { FormErrorService, I18nService, ToastService, formatFechaLarga } from '@reddoc/core';
import { ParametroService } from '@erp/core/services/parametro.service';
import type { AppDict } from '@erp/i18n';
import { FacturaElectronicaService } from '../../factura-electronica.service';

/** Estado del certificado del contenedor, del más urgente al más tranquilo. */
export type CertificadoEstado = 'sin-certificado' | 'vencido' | 'por-vencer' | 'vigente';

/** Días antes del vencimiento en los que ya se avisa (y se deja reemplazar). */
const DIAS_AVISO = 30;

/** Extensiones del certificado digital que emite la DIAN. */
const ACCEPT = '.p12,.pfx';
const MAX_MB = 5;

/**
 * Convierte `AAAA-MM-DD` en una fecha **local**.
 *
 * `new Date('2027-03-14')` la interpreta como medianoche UTC: al oeste de
 * Greenwich el certificado aparecería venciendo el día anterior.
 */
function parseFechaLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

/** Días completos entre hoy y la fecha, negativo si ya pasó. */
function diasHasta(fecha: Date): number {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((fecha.getTime() - desde.getTime()) / 86_400_000);
}

/**
 * Paso «Certificado digital» del asistente de facturación electrónica.
 *
 * Auto-contenido: lee su estado (`gen_certificado_vence`), sube el archivo y lo
 * relee. Solo avisa hacia afuera cuando el usuario quiere avanzar.
 *
 * La regla de reemplazo es de negocio, no de UI: con un certificado **vigente**
 * no se puede subir otro —evita pisarlo por accidente—, pero desde 30 días
 * antes del vencimiento sí, porque caducan todos los años y sin esa puerta la
 * empresa dejaría de facturar esperando a soporte.
 */
@Component({
  selector: 'app-certificado-step',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, PasswordModule, FieldErrorComponent],
  templateUrl: './certificado-step.component.html',
})
export class CertificadoStepComponent {
  private readonly parametro = inject(ParametroService);
  private readonly facturaElectronica = inject(FacturaElectronicaService);
  private readonly formErrors = inject(FormErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly accept = ACCEPT;

  /** El usuario terminó con este paso y quiere seguir. */
  readonly avanzar = output<void>();

  protected readonly loading = signal(true);
  protected readonly subiendo = signal(false);
  protected readonly vence = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly dragOver = signal(false);
  protected readonly fileError = signal<string | null>(null);
  /** El usuario pidió reemplazar un certificado que todavía no venció. */
  protected readonly reemplazando = signal(false);

  protected readonly form = this.fb.group({
    clave: this.fb.nonNullable.control('', Validators.required),
  });

  protected readonly venceDate = computed(() => parseFechaLocal(this.vence()));

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

  /** La zona de carga aparece si no hay certificado, si venció, o si lo pidió. */
  protected readonly puedeCargar = computed(
    () => this.estado() === 'sin-certificado' || this.estado() === 'vencido' || this.reemplazando(),
  );

  /** Reemplazar solo se ofrece en la ventana de aviso; vigente no se toca. */
  protected readonly puedeReemplazar = computed(
    () => this.estado() === 'por-vencer' && !this.reemplazando(),
  );

  protected readonly puedeSubir = computed(
    () => this.selectedFile() !== null && this.form.valid && !this.subiendo(),
  );

  /** Fecha larga (`14 de marzo de 2027`), como el resto del ERP. */
  protected readonly venceTexto = computed(() => formatFechaLarga(this.venceDate()));

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

  private cargarEstado(): void {
    this.loading.set(true);
    this.parametro
      .certificadoVence()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vence) => {
          this.vence.set(vence);
          this.loading.set(false);
        },
        // Sin dato se asume que no hay certificado: deja al usuario cargarlo en
        // vez de trabarlo. Si ya tenía uno, el backend rechazará la subida.
        error: () => {
          this.vence.set(null);
          this.loading.set(false);
        },
      });
  }

  protected onReemplazar(): void {
    this.reemplazando.set(true);
  }

  protected openFilePicker(input: HTMLInputElement): void {
    if (this.subiendo()) return;
    input.click();
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) this.aceptarArchivo(file);
    // Permite volver a elegir el mismo archivo tras quitarlo.
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.subiendo()) return;
    this.dragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.subiendo()) return;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) this.aceptarArchivo(file);
  }

  protected quitarArchivo(): void {
    if (this.subiendo()) return;
    this.selectedFile.set(null);
    this.fileError.set(null);
  }

  private aceptarArchivo(file: File): void {
    const dict = this.t().facturacionElectronica.certificado.errors;
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!ACCEPT.split(',').includes(extension)) {
      this.selectedFile.set(null);
      this.fileError.set(dict.tipo.replace('{tipos}', ACCEPT));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      this.selectedFile.set(null);
      this.fileError.set(dict.tamano.replace('{max}', String(MAX_MB)));
      return;
    }
    this.fileError.set(null);
    this.selectedFile.set(file);
  }

  protected onSubmit(): void {
    const file = this.selectedFile();
    if (!file || this.form.invalid || this.subiendo()) {
      this.form.markAllAsTouched();
      return;
    }
    this.subiendo.set(true);

    const dict = this.t().facturacionElectronica.certificado;
    this.facturaElectronica
      .cargarCertificado(file, this.form.getRawValue().clave)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.subiendo.set(false);
          this.selectedFile.set(null);
          this.reemplazando.set(false);
          this.form.reset();
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
          // El vencimiento lo sabe el backend, no nosotros: se relee para que
          // la tarjeta muestre la fecha real del archivo recién subido.
          this.cargarEstado();
        },
        error: (err: unknown) => {
          this.subiendo.set(false);
          // Una clave incorrecta es el error más probable, y el backend la
          // señala por campo: que aterrice bajo la clave, no en un toast.
          this.formErrors.handle(this.form, err, dict.toasts.error.title);
        },
      });
  }
}
