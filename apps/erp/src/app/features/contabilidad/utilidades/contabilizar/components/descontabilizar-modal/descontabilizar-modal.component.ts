import { Component, DestroyRef, computed, inject, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { finalize, switchMap } from 'rxjs';
import {
  I18nService,
  ToastService,
  startOfToday,
  toIsoDate,
  type ErpSelectOption,
} from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ContabilizarService } from '../../contabilizar.service';
import { DESCONTABILIZAR_LIMITE } from '../../contabilizar.constants';
import { rangoFechas } from '../../../../shared/informe-cuentas.validators';

/** Catálogo de tipos de documento que van a contabilidad. */
const DOCUMENTO_TIPO_ENDPOINT = '/general/documento-tipo/seleccionar/';

/**
 * Modal de **descontabilizar**.
 *
 * A diferencia del resto de acciones en lote del ERP, **no opera sobre la
 * selección de la tabla** sino sobre un criterio: periodo (obligatorio), rango
 * de números y tipo de documento. Al confirmar resuelve ese criterio a una
 * lista de ids y los manda en una sola petición.
 *
 * Es un port fiel del ERP anterior. Lo que sí se agrega es **avisar cuando el
 * criterio abarca más documentos de los que entran en el tope**
 * (`DESCONTABILIZAR_LIMITE`): allá los sobrantes se descartaban en silencio.
 *
 * Ver `SUGERENCIAS.md` de esta carpeta: que el usuario no vea qué se va a
 * revertir es la principal mejora pendiente de esta pantalla.
 */
@Component({
  selector: 'app-descontabilizar-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    DatePickerModule,
    InputNumberModule,
    ErpApiSelectComponent,
  ],
  templateUrl: './descontabilizar-modal.component.html',
  styles: ':host { display: contents; }',
})
export class DescontabilizarModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ContabilizarService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = model<boolean>(false);
  /** Se emite al terminar, para que el host recargue la lista. */
  readonly done = output<void>();

  protected readonly processing = signal(false);
  protected readonly documentoTipoEndpoint = DOCUMENTO_TIPO_ENDPOINT;
  /** Solo tipos que llevan contabilidad, igual que el ERP anterior. */
  protected readonly documentoTipoParams = { contabilidad: 'True' };

  protected readonly form = this.fb.nonNullable.group(
    {
      fecha_desde: [startOfToday(), Validators.required],
      fecha_hasta: [startOfToday(), Validators.required],
      numero_desde: [null as number | null],
      numero_hasta: [null as number | null],
      documento_tipo: [null as ErpSelectOption | null],
    },
    { validators: rangoFechas('fecha_desde', 'fecha_hasta') },
  );

  protected readonly canSubmit = computed(() => !this.processing());

  protected submit(): void {
    if (this.form.invalid || this.processing()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const dict = this.t().entities.contabilizar;

    this.processing.set(true);
    this.service
      .buscarParaDescontabilizar({
        fecha_desde: toIsoDate(value.fecha_desde) ?? '',
        fecha_hasta: toIsoDate(value.fecha_hasta) ?? '',
        numero_desde: value.numero_desde,
        numero_hasta: value.numero_hasta,
        documento_tipo_id: value.documento_tipo?.id ?? null,
      })
      .pipe(
        switchMap((candidatos) => {
          if (candidatos.ids.length === 0) {
            throw new SinDocumentosError();
          }
          // El backend puede tener más documentos en el rango de los que trajo
          // la consulta: se avisa en vez de descartarlos en silencio.
          if (candidatos.total > candidatos.ids.length) {
            this.toast.info(
              dict.descontabilizar.toasts.parcial.title,
              dict.descontabilizar.toasts.parcial.desc
                .replace('{procesados}', String(candidatos.ids.length))
                .replace('{total}', String(candidatos.total))
                .replace('{limite}', String(DESCONTABILIZAR_LIMITE)),
            );
          }
          return this.service.descontabilizar(candidatos.ids);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processing.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(
            dict.descontabilizar.toasts.success.title,
            dict.descontabilizar.toasts.success.desc,
          );
          this.visible.set(false);
          this.done.emit();
        },
        error: (error: unknown) => {
          if (error instanceof SinDocumentosError) {
            this.toast.error(
              dict.descontabilizar.toasts.empty.title,
              dict.descontabilizar.toasts.empty.desc,
            );
            return;
          }
          this.toast.error(
            dict.descontabilizar.toasts.error.title,
            dict.descontabilizar.toasts.error.desc,
          );
        },
      });
  }
}

/** El criterio no encontró ningún documento contabilizado. */
class SinDocumentosError extends Error {
  constructor() {
    super('El criterio no coincide con ningún documento contabilizado');
    this.name = 'SinDocumentosError';
  }
}
